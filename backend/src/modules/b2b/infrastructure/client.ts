const ENDPOINT = 'https://www.b2b-center.ru/market/remote.html'

export async function loadFirmTenders(login: string, password: string, signal?: AbortSignal) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:ws#findFirmTenders',
    },
    body: envelope(login, password),
    signal,
  })
  return response.text()
}

function envelope(login: string, password: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ws">
  <SOAP-ENV:Body>
    <urn:RemoteMarket.findFirmTenders>
      <urn:auth>
        <urn:login>${escapeXml(login)}</urn:login>
        <urn:password>${escapeXml(password)}</urn:password>
      </urn:auth>
    </urn:RemoteMarket.findFirmTenders>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
