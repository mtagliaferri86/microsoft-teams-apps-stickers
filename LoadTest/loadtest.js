import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// you can specify stages of your test (ramp up/down patterns) through the options object
// target is the number of VUs you are aiming for

export const options = {
    scenarios: {
        botRequests: {
            executor: 'ramping-arrival-rate',
            startRate: 2,
            timeUnit: '1s',
            preAllocatedVUs: 5000,
            maxVUs: 99999,
            stages: [
                { target: 20, duration: '5m' },
                { target: 50, duration: '5m' },
                { target: 80, duration: '5m' },
                { target: 100, duration: '5m' },
                { target: 200, duration: '5m' },
                { target: 200, duration: '10m' }
            ],
        },
    },
    thresholds: {
        'http_req_duration': ['p(99)<2000'], // 99% of requests must complete below 2s
    }
};

const BASE_URL = "https://fumerstickers.azurewebsites.net";

const sampleRequests = new SharedArray('sampleRequest', function () {
    return JSON.parse(open('./sampleRequests.json'));
});
const bearerToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ilp5R2gxR2JCTDh4ZDFrT3hSWWNoYzFWUFNRUSIsInR5cCI6IkpXVCIsIng1dCI6Ilp5R2gxR2JCTDh4ZDFrT3hSWWNoYzFWUFNRUSJ9.eyJzZXJ2aWNldXJsIjoiaHR0cHM6Ly9zbWJhLnRyYWZmaWNtYW5hZ2VyLm5ldC9lbWVhLyIsIm5iZiI6MTY0ODgwNTYxMSwiZXhwIjoxNjQ4ODA5MjExLCJpc3MiOiJodHRwczovL2FwaS5ib3RmcmFtZXdvcmsuY29tIiwiYXVkIjoiMTg0MmE2MjEtMDFiNy00NWMwLTk2MTQtNjc3YWUxZDUyM2FkIn0.qfxIlVzpZspuCz6vPuKJZ2p81uBLljjV2yEwDGybQBZG3ok1OIB_4DX9w3cUktI3a7tIfRrpgbfDjC1cQ5Wid7NZ0RqpWw_enahS2xSeXaqjdEPM-zUTDhaNbsYhk6OmE7YREDU4If_Rj51TgwjKwgkspYnBYRdvE-qUWMVNgz9BLsjd-OxB_2YAc_Du7NQr3OjCCxmfDop2mn5FULkwPeTVQ9zubulHDWxO07a690PeJSLx69iWIxG4QC7jyp39g1_sRLaUH7EOes8Z-AhWimY9KNQkAFMFwXgK1bG95ETSVBurOuN0tDhtwhuKGEpIwOuGjMHFSeeYTL_iwfBa7g";
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bearerToken}` };

export default function () {
    const res = http.post(`${BASE_URL}/api/messages`,
        JSON.stringify(sampleRequests[randomIntBetween(0, sampleRequests.length - 1)]), {
        headers: headers
    })

    sleep(1);

    const checkRes = check(res, {
        'status is 200': (r) => r.status === 200,
        'has attachments': (r) => r.body && r.json("composeExtension.attachments")
    });
}

export function handleSummary(data) {
    return {
        "summary.html": htmlReport(data)
        , 'stdout': textSummary(data, { indent: ' ', enableColors: true })
    };
}