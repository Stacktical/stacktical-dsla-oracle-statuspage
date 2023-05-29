require('dotenv').config();
import * as Joi from 'joi';
import { NETWORKS } from './constants';
import axios from 'axios';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { SLAABI, MessengerABI } from './abis';

// console.log(process.env);

const networksObject = Object.keys(NETWORKS).reduce(
  (r, networkName) => ({
    ...r,
    [`${networkName.toUpperCase()}_URI`]: Joi.string().uri().required(),
  }),
  {}
);

const schema = Joi.object({
  IPFS_GATEWAY_URI: Joi.string().uri().required(),
  ...networksObject,
}).unknown();

const { error } = schema.validate(process.env);

if (error) {
  throw new Error(`Configuration error: ${error.message}`);
}

type NetworkName = keyof typeof NETWORKS;

type SLAData = {
  serviceName: string;
  serviceDescription: string;
  serviceImage: string;
  serviceURL: string;
  serviceAddress: string;
  serviceTicker: string;
  serviceUseTestExternalAdapter: boolean;
  serviceSliMockingPlan: Array<number>;
  periodType: number;
  messengerAddress: string;
};

async function getSLAData(address: string, networkName: string): Promise<SLAData> {
  const networkURI = NETWORKS[networkName as NetworkName];
  if (!networkURI) {
    throw new Error(`No network URI found for network: ${networkName}`);
  }
  const web3 = new Web3(networkURI);

  const slaContract = new web3.eth.Contract(SLAABI as AbiItem[], address);
  const ipfsCID = await slaContract.methods.ipfsHash().call();
  const periodType = await slaContract.methods.periodType().call();
  const messengerAddress = await slaContract.methods.messengerAddress().call();
  const { data } = await axios.get(`${process.env.IPFS_GATEWAY_URI}/ipfs/${ipfsCID}`);
  return { ...data, periodType, messengerAddress };
}

async function getMessengerPrecision(messengerAddress: string, networkName: string): Promise<number> {
  const networkURI = NETWORKS[networkName as NetworkName];
  if (!networkURI) {
    throw new Error(`No network URI found for network: ${networkName}`);
  }
  const web3 = new Web3(networkURI);

  const messenger = new web3.eth.Contract(MessengerABI as AbiItem[], messengerAddress);
  return await messenger.methods.messengerPrecision().call();
}

const STATUSPAGE_API_BASE = 'https://status.openai.com/api/v2';

function calculateServiceQualityPercentage(
  incidents: any[],
  periodStart: number,
  periodEnd: number,
  precision: number
): number {
  if (!Array.isArray(incidents)) {
    throw new Error('Incidents data is not an array');
  }

  let totalDowntimeMinutes = 0;

  incidents.forEach((incident) => {
    if (incident.impact !== 'none') {
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

exports['dsla-oracle-statuspage'] = async (
  req: {
    body: {
      id: number;
      data: {
        period_start: number;
        period_end: number;
        address: string;
        network_name: string;
      };
    };
  },
  res: any
) => {
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

    const incidentsResponse = await axios.get(`${STATUSPAGE_API_BASE}/incidents.json`);
    const incidentsData = incidentsResponse.data;

    if (!incidentsData || incidentsResponse.status !== 200) {
      throw new Error('Failed to fetch incidents data');
    }

    const incidents = incidentsData.incidents;
    const serviceQualityPercentage = calculateServiceQualityPercentage(incidents, periodStart * 1000, periodEnd * 1000, messengerPrecision);

    res.send({
      jobRunID: req.body.id,
      data: { result: serviceQualityPercentage },
    });
  } catch (error: any) {
    console.error('Error:', error.message);
    res.send({
      jobRunID: req.body.id,
      data: { result: null },
      error: error.message,
    });
  }
};