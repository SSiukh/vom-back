import { createInterface } from 'readline';
import { Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const MIN_PASSWORD_LENGTH = 8;

const logger = new Logger('CreateAdmin');
const prisma = new PrismaClient();

function createPrompter() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const bufferedLines: string[] = [];
  const pendingResolvers: ((line: string) => void)[] = [];

  rl.on('line', (line) => {
    const resolver = pendingResolvers.shift();
    if (resolver) {
      resolver(line);
    } else {
      bufferedLines.push(line);
    }
  });

  return {
    ask(query: string): Promise<string> {
      process.stdout.write(query);
      const buffered = bufferedLines.shift();
      if (buffered !== undefined) {
        return Promise.resolve(buffered);
      }

      return new Promise((resolve) => pendingResolvers.push(resolve));
    },
    close(): void {
      rl.close();
    },
  };
}

async function main(): Promise<void> {
  const prompter = createPrompter();

  try {
    const login = (await prompter.ask('Логін: ')).trim();
    if (!login) {
      throw new Error('Логін не може бути порожнім');
    }

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      throw new Error(`Користувач із логіном "${login}" вже існує`);
    }

    const password = await prompter.ask('Пароль: ');
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`,
      );
    }

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        login,
        passwordHash,
        twoFaEnabled: false,
        twoFaSecret: null,
        twoFaRecoveryCodes: [],
        refreshTokenHash: null,
      },
    });

    logger.log(`Створено користувача "${user.login}" (id: ${user.id})`);
  } finally {
    prompter.close();
  }
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
