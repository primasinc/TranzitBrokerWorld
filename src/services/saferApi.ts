import axios from 'axios';

const FMCSA_API_BASE = 'https://mobile.fmcsa.dot.gov/qc/services';
const WEB_KEY = 'a75013f2c4ff413a7dc6021f5b83c9e0d56c216a';

export async function fetchCarrierByMC(mcNumber: string) {
  const url = `${FMCSA_API_BASE}/carriers/docket-number/${mcNumber}?webKey=${WEB_KEY}`;
  const response = await axios.get(url);
  return response.data;
} 