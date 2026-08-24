"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipTwoFaGate = exports.SKIP_TWO_FA_GATE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_TWO_FA_GATE_KEY = 'skipTwoFaGate';
const SkipTwoFaGate = () => (0, common_1.SetMetadata)(exports.SKIP_TWO_FA_GATE_KEY, true);
exports.SkipTwoFaGate = SkipTwoFaGate;
//# sourceMappingURL=skip-two-fa-gate.decorator.js.map