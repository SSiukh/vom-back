"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = require("readline");
const common_1 = require("@nestjs/common");
const argon2 = require("argon2");
const client_1 = require("@prisma/client");
const MIN_PASSWORD_LENGTH = 8;
const logger = new common_1.Logger('CreateAdmin');
const prisma = new client_1.PrismaClient();
function createPrompter() {
    const rl = (0, readline_1.createInterface)({ input: process.stdin, output: process.stdout });
    const bufferedLines = [];
    const pendingResolvers = [];
    rl.on('line', (line) => {
        const resolver = pendingResolvers.shift();
        if (resolver) {
            resolver(line);
        }
        else {
            bufferedLines.push(line);
        }
    });
    return {
        ask(query) {
            process.stdout.write(query);
            const buffered = bufferedLines.shift();
            if (buffered !== undefined) {
                return Promise.resolve(buffered);
            }
            return new Promise((resolve) => pendingResolvers.push(resolve));
        },
        close() {
            rl.close();
        },
    };
}
async function main() {
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
            throw new Error(`Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`);
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
    }
    finally {
        prompter.close();
    }
}
main()
    .catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=create-admin.js.map