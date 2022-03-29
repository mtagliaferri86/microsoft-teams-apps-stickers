import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// you can specify stages of your test (ramp up/down patterns) through the options object
// target is the number of VUs you are aiming for

export const options = {
    stages: [
        { target: 10, duration: '5m' },
        { target: 100, duration: '15m' },
        { target: 200, duration: '15m' },
        { target: 300, duration: '15m' },
        { target: 400, duration: '15m' },
        { target: 500, duration: '15m' },
        { target: 700, duration: '20m' },
        { target: 1000, duration: '30m' }
    ],
    thresholds: {
        'http_req_duration': ['p(99)<2000'], // 99% of requests must complete below 2s
    }
};

const BASE_URL = "https://fumerstickers.azurewebsites.net";

const sampleRequests = new SharedArray('sampleRequest', function() {
    return JSON.parse(open('./sampleRequests.json'));
});
const headers = { 'Content-Type': 'application/json' };

export default function() {
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
        "summary.html": htmlReport(data),
        'stdout': textSummary(data, { indent: ' ', enableColors: true })
    };
}