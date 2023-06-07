"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const Joi = __importStar(require("joi"));
const constants_1 = require("./constants");
const axios_1 = __importDefault(require("axios"));
const web3_1 = __importDefault(require("web3"));
const abis_1 = require("./abis");
// console.log(process.env);
const networksObject = Object.keys(constants_1.NETWORKS).reduce((r, networkName) => ({
    ...r,
    [`${networkName.toUpperCase()}_URI`]: Joi.string().uri().required(),
}), {});
const schema = Joi.object({
    IPFS_GATEWAY_URI: Joi.string().uri().required(),
    ...networksObject,
}).unknown();
const { error } = schema.validate(process.env);
if (error) {
    throw new Error(`Configuration error: ${error.message}`);
}
const impacts = ['minor', 'major', 'critical'];
async function getSLAData(address, networkName) {
    const networkURI = constants_1.NETWORKS[networkName];
    if (!networkURI) {
        throw new Error(`No network URI found for network: ${networkName}`);
    }
    const web3 = new web3_1.default(networkURI);
    const slaContract = new web3.eth.Contract(abis_1.SLAABI, address);
    const ipfsCID = await slaContract.methods.ipfsHash().call();
    const periodType = await slaContract.methods.periodType().call();
    const messengerAddress = await slaContract.methods.messengerAddress().call();
    const { data } = await axios_1.default.get(`${process.env.IPFS_GATEWAY_URI}/ipfs/${ipfsCID}`);
    return { ...data, periodType, messengerAddress };
}
async function getMessengerPrecision(messengerAddress, networkName) {
    const networkURI = constants_1.NETWORKS[networkName];
    if (!networkURI) {
        throw new Error(`No network URI found for network: ${networkName}`);
    }
    const web3 = new web3_1.default(networkURI);
    const messenger = new web3.eth.Contract(abis_1.MessengerABI, messengerAddress);
    return await messenger.methods.messengerPrecision().call();
}
function calculateServiceQualityPercentage(incidents, periodStart, periodEnd, precision, component, impactCutoff) {
    if (!Array.isArray(incidents)) {
        throw new Error('Incidents data is not an array');
    }
    let totalDowntimeMinutes = 0;
    const minImpactIndex = impacts.indexOf(impactCutoff);
    incidents.forEach((incident) => {
        const isComponentInvolved = incident.components.some((comp) => component.map(c => c.toLowerCase()).includes(comp.name.toLowerCase()));
        const incidentImpactIndex = impacts.indexOf(incident.impact);
        if (isComponentInvolved && incidentImpactIndex >= minImpactIndex) {
            const incidentStart = Date.parse(incident.created_at);
            const incidentEnd = Date.parse(incident.resolved_at);
            if (incidentStart >= periodStart && incidentEnd <= periodEnd) {
                totalDowntimeMinutes += (incidentEnd - incidentStart) / 60000;
            }
        }
    });
    const totalMinutes = (periodEnd - periodStart) / 60000;
    const serviceQualityPercentage = (((totalMinutes - totalDowntimeMinutes) / totalMinutes) * 100) * precision;
    return serviceQualityPercentage;
}
exports['dsla-oracle-statuspage'] = async (req, res) => {
    try {
        const { id, data } = req.body;
        const { period_start: periodStart, period_end: periodEnd, address: slaAddress, network_name: networkName } = data;
        // Log entire request body
        console.log('Request body:', req.body);
        // Log the timestamp values received and their converted date representations
        console.log('Timestamps received:', { periodStart, periodEnd });
        console.log('Dates received:', {
            periodStartDate: new Date(Number(periodStart) * 1000).toLocaleString(),
            periodEndDate: new Date(Number(periodEnd) * 1000).toLocaleString(),
        });
        const requestData = {
            sla_address: slaAddress,
            network_name: networkName,
            sla_monitoring_start: periodStart,
            sla_monitoring_end: periodEnd,
        };
        const slaData = await getSLAData(requestData.sla_address, requestData.network_name);
        const messengerPrecision = await getMessengerPrecision(slaData.messengerAddress, requestData.network_name);
        const incidentsResponse = await axios_1.default.get(`${slaData.statusPageUrl}/incidents.json`);
        const incidentsData = incidentsResponse.data;
        if (!incidentsData || incidentsResponse.status !== 200) {
            throw new Error('Failed to fetch incidents data');
        }
        const incidents = incidentsData.incidents;
        const serviceQualityPercentage = calculateServiceQualityPercentage(incidents, periodStart * 1000, periodEnd * 1000, messengerPrecision, slaData.component, slaData.impactCutoff);
        res.send({
            jobRunID: req.body.id,
            data: { result: serviceQualityPercentage },
        });
    }
    catch (error) {
        console.error('Error:', error.message);
        res.send({
            jobRunID: req.body.id,
            data: { result: null },
            error: error.message,
        });
    }
};
//# sourceMappingURL=index.js.map