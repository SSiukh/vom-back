"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const core_module_1 = require("./core/core.module");
const senders_module_1 = require("./senders/senders.module");
const dictionaries_module_1 = require("./dictionaries/dictionaries.module");
const products_module_1 = require("./products/products.module");
const orders_module_1 = require("./orders/orders.module");
const nova_poshta_module_1 = require("./nova-poshta/nova-poshta.module");
const expenses_module_1 = require("./expenses/expenses.module");
const crm_module_1 = require("./crm/crm.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const auth_module_1 = require("./auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_module_1.CoreModule,
            senders_module_1.SendersModule,
            dictionaries_module_1.DictionariesModule,
            products_module_1.ProductsModule,
            orders_module_1.OrdersModule,
            nova_poshta_module_1.NovaPoshtaModule,
            expenses_module_1.ExpensesModule,
            crm_module_1.CrmModule,
            dashboard_module_1.DashboardModule,
            auth_module_1.AuthModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map