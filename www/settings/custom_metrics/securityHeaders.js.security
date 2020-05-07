const data = $WPT_REQUESTS;
const HEADERS_SCORES = {
  "strict-transport-security": 25,
  "content-security-policy": 25,
  "x-frame-options": 20,
  "x-xss-protection": 20,
  "x-content-type-options": 20
};

function getHttpHeadersAndScheme(requests) {
  let scheme = "http";
  const singleRequest = requests.find((request) => {
    const httpResponseCode = request.status;
    if (httpResponseCode >= 200 && httpResponseCode < 300) {
      if (request.remotePort === 443) {
        scheme = "https";
      }
      return true;
    }

    return false;
  });

  const headers = singleRequest.response_headers;
  return {
    headers,
    scheme,
  };
}

function detectSecurityHeaders({ headers, scheme }) {
  const securityHeadersHttp = [
    "content-security-policy",
    "x-frame-options",
    "x-xss-protection",
    "x-content-type-options"
  ];

  const securityHeadersHttps = [
    "strict-transport-security",
    ...securityHeadersHttp,
  ];

  const foundSecurityHeaders = [];

  for (const [headerName, headerValue] of Object.entries(headers)) {
    const normalizedHeaderName = headerName.toLowerCase();

    let securityHeadersPool =
      scheme === "https" ? securityHeadersHttps : securityHeadersHttp;
    if (securityHeadersPool.includes(normalizedHeaderName)) {
      if (normalizedHeaderName === "x-xss-protection" && headerValue == 0) {
        continue;
      }
      foundSecurityHeaders.push(normalizedHeaderName);
    }
  }

  return foundSecurityHeaders;
}

function getHeadersGrade({ securityHeaders }) {
  let totalScore = 0;

  securityHeaders.forEach((headerName) => {
    const headerScore = HEADERS_SCORES[headerName];
    totalScore += headerScore;
  });

  const grade = getGrade(totalScore);
  return {
    grade,
    totalScore,
  };
}

function getGrade(totalScore) {
  if (totalScore >= 95) {
    return "A+";
  }

  if (totalScore >= 75) {
    return "A";
  }

  if (totalScore >= 60) {
    return "B";
  }

  if (totalScore >= 50) {
    return "C";
  }

  if (totalScore >= 29) {
    return "D";
  }

  if (totalScore >= 14) {
    return "E";
  }

  if (totalScore >= 0) {
    return "F";
  }
}

const { headers, scheme } = getHttpHeadersAndScheme(data);
const securityHeaders = detectSecurityHeaders({ headers, scheme });
const { grade, totalScore } = getHeadersGrade({ securityHeaders });

return {
  securityHeadersList: securityHeaders,
  securityHeadersGrade: grade,
  securityHeadersScore: totalScore,
};
