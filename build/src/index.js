"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
require('dotenv').config();
var Joi = require("joi");
var constants_1 = require("./constants");
var axios_1 = require("axios");
var web3_1 = require("web3");
var abis_1 = require("./abis");
// console.log(process.env);
var networksObject = Object.keys(constants_1.NETWORKS).reduce(function (r, networkName) {
    var _a;
    return (__assign(__assign({}, r), (_a = {}, _a["".concat(networkName.toUpperCase(), "_URI")] = Joi.string().uri().required(), _a)));
}, {});
var schema = Joi.object(__assign({ IPFS_GATEWAY_URI: Joi.string().uri().required() }, networksObject)).unknown();
var error = schema.validate(process.env).error;
if (error) {
    throw new Error("Configuration error: ".concat(error.message));
}
var impacts = ['minor', 'major', 'critical'];
function getSLAData(address, networkName) {
    return __awaiter(this, void 0, void 0, function () {
        var networkURI, web3, slaContract, ipfsCID, periodType, messengerAddress, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    networkURI = constants_1.NETWORKS[networkName];
                    if (!networkURI) {
                        throw new Error("No network URI found for network: ".concat(networkName));
                    }
                    web3 = new web3_1["default"](networkURI);
                    slaContract = new web3.eth.Contract(abis_1.SLAABI, address);
                    return [4 /*yield*/, slaContract.methods.ipfsHash().call()];
                case 1:
                    ipfsCID = _a.sent();
                    return [4 /*yield*/, slaContract.methods.periodType().call()];
                case 2:
                    periodType = _a.sent();
                    return [4 /*yield*/, slaContract.methods.messengerAddress().call()];
                case 3:
                    messengerAddress = _a.sent();
                    return [4 /*yield*/, axios_1["default"].get("".concat(process.env.IPFS_GATEWAY_URI, "/ipfs/").concat(ipfsCID))];
                case 4:
                    data = (_a.sent()).data;
                    return [2 /*return*/, __assign(__assign({}, data), { periodType: periodType, messengerAddress: messengerAddress })];
            }
        });
    });
}
function getMessengerPrecision(messengerAddress, networkName) {
    return __awaiter(this, void 0, void 0, function () {
        var networkURI, web3, messenger;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    networkURI = constants_1.NETWORKS[networkName];
                    if (!networkURI) {
                        throw new Error("No network URI found for network: ".concat(networkName));
                    }
                    web3 = new web3_1["default"](networkURI);
                    messenger = new web3.eth.Contract(abis_1.MessengerABI, messengerAddress);
                    return [4 /*yield*/, messenger.methods.messengerPrecision().call()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function calculateServiceQualityPercentage(incidents, periodStart, periodEnd, precision, component, impactCutoff) {
    if (!Array.isArray(incidents)) {
        throw new Error('Incidents data is not an array');
    }
    var totalDowntimeMinutes = 0;
    var minImpactIndex = impacts.indexOf(impactCutoff);
    incidents.forEach(function (incident) {
        var isComponentInvolved = incident.components.some(function (comp) {
            return component.map(function (c) { return c.toLowerCase(); }).includes(comp.name.toLowerCase());
        });
        var incidentImpactIndex = impacts.indexOf(incident.impact);
        if (isComponentInvolved && incidentImpactIndex >= minImpactIndex) {
            var incidentStart = Date.parse(incident.created_at);
            var incidentEnd = Date.parse(incident.resolved_at);
            if (incidentStart >= periodStart && incidentEnd <= periodEnd) {
                totalDowntimeMinutes += (incidentEnd - incidentStart) / 60000;
            }
        }
    });
    var totalMinutes = (periodEnd - periodStart) / 60000;
    var serviceQualityPercentage = (((totalMinutes - totalDowntimeMinutes) / totalMinutes) * 100) * precision;
    return serviceQualityPercentage;
}
exports['dsla-oracle-statuspage'] = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, data, periodStart, periodEnd, slaAddress, networkName, requestData, slaData, messengerPrecision, incidentsResponse, incidentsData, incidents, serviceQualityPercentage, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, id = _a.id, data = _a.data;
                periodStart = data.period_start, periodEnd = data.period_end, slaAddress = data.address, networkName = data.network_name;
                // Log entire request body
                console.log('Request body:', req.body);
                // Log the timestamp values received and their converted date representations
                console.log('Timestamps received:', { periodStart: periodStart, periodEnd: periodEnd });
                console.log('Dates received:', {
                    periodStartDate: new Date(Number(periodStart) * 1000).toLocaleString(),
                    periodEndDate: new Date(Number(periodEnd) * 1000).toLocaleString()
                });
                requestData = {
                    sla_address: slaAddress,
                    network_name: networkName,
                    sla_monitoring_start: periodStart,
                    sla_monitoring_end: periodEnd
                };
                return [4 /*yield*/, getSLAData(requestData.sla_address, requestData.network_name)];
            case 1:
                slaData = _b.sent();
                return [4 /*yield*/, getMessengerPrecision(slaData.messengerAddress, requestData.network_name)];
            case 2:
                messengerPrecision = _b.sent();
                return [4 /*yield*/, axios_1["default"].get("".concat(slaData.statusPageUrl, "/incidents.json"))];
            case 3:
                incidentsResponse = _b.sent();
                incidentsData = incidentsResponse.data;
                if (!incidentsData || incidentsResponse.status !== 200) {
                    throw new Error('Failed to fetch incidents data');
                }
                incidents = incidentsData.incidents;
                serviceQualityPercentage = calculateServiceQualityPercentage(incidents, periodStart * 1000, periodEnd * 1000, messengerPrecision, slaData.component, slaData.impactCutoff);
                res.send({
                    jobRunID: req.body.id,
                    data: { result: serviceQualityPercentage }
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                console.error('Error:', error_1.message);
                res.send({
                    jobRunID: req.body.id,
                    data: { result: null },
                    error: error_1.message
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
