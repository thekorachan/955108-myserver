"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const UserRoutes_1 = __importDefault(require("./UserRoutes"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const node_dns_1 = __importDefault(require("node:dns"));
node_dns_1.default.setServers(['1.1.1.1', '8.8.8.8']);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.sendFile('users.html', { root: __dirname });
});
app.use('/api', UserRoutes_1.default);
const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
    throw new Error('Set MONGODB_URI in .env');
}
mongoose_1.default.connect(MONGODB_URI)
    .then(() => {
    console.log('Connected to MongoDB');
    app.listen(3001, () => {
        console.log('Server is running on port 3001');
    });
})
    .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
});
