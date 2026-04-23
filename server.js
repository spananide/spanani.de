const http = require('http');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const NTP_SERVERS = [
  'time.google.com',
  'time.cloudflare.com',
  'pool.ntp.org',
];

const NTP_PORT = 123;
const NTP_TO_UNIX_MS = 2208988800000;

function ntpTimestampToUnixMs(buffer, offset) {
  const seconds = buffer.readUInt32BE(offset);
  const fraction = buffer.readUInt32BE(offset + 4);
  return (seconds * 1000) + Math.round((fraction * 1000) / 0x100000000) - NTP_TO_UNIX_MS;
}

function queryNtpServer(server, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const packet = Buffer.alloc(48);
    packet[0] = 0x1b;

    const t1 = Date.now();
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      fn(value);
    };

    socket.once('error', (error) => finish(reject, error));

    socket.once('message', (msg) => {
      const t4 = Date.now();
      if (msg.length < 48) {
        finish(reject, new Error('Invalid NTP packet'));
        return;
      }

      const t2 = ntpTimestampToUnixMs(msg, 32);
      const t3 = ntpTimestampToUnixMs(msg, 40);
      const delay = (t4 - t1) - (t3 - t2);
      const offset = ((t2 - t1) + (t3 - t4)) / 2;

      finish(resolve, {
        server,
        offsetMs: offset,
        rttMs: t4 - t1,
        delayMs: delay,
        ntpNowMs: t4 + offset,
      });
    });

    const timer = setTimeout(() => {
      finish(reject, new Error(`Timeout querying ${server}`));
    }, timeoutMs);

    socket.send(packet, 0, packet.length, NTP_PORT, server, (error) => {
      if (error) finish(reject, error);
    });
  });
}

async function getBestNtpSample(sampleCount = 3) {
  const targets = Array.from({ length: sampleCount }, (_, index) => NTP_SERVERS[index % NTP_SERVERS.length]);
  const results = await Promise.allSettled(targets.map((server) => queryNtpServer(server)));
  const ok = results
    .filter((entry) => entry.status === 'fulfilled')
    .map((entry) => entry.value)
    .sort((a, b) => a.delayMs - b.delayMs);

  if (!ok.length) {
    throw new Error('No NTP responses');
  }

  const best = ok[0];
  const bestDelay = Math.max(1, best.delayMs);
  const usable = ok.filter((sample) => sample.delayMs <= bestDelay * 2.5);

  let weightSum = 0;
  let offsetSum = 0;
  usable.forEach((sample) => {
    const weight = 1 / Math.max(1, sample.delayMs);
    weightSum += weight;
    offsetSum += sample.offsetMs * weight;
  });

  const weightedOffset = offsetSum / weightSum;
  const ntpNowMs = Date.now() + weightedOffset;

  return {
    ntpNowMs,
    offsetMs: weightedOffset,
    rttMs: best.rttMs,
    delayMs: best.delayMs,
    server: best.server,
    samples: usable.length,
    accuracyMs: Math.max(5, Math.round(best.delayMs / 2)),
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/clock') pathname = '/clock.html';
  const filePath = path.normalize(path.join(ROOT, pathname));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/ntp') {
    try {
      const count = Math.min(5, Math.max(1, Number(url.searchParams.get('samples') || '3')));
      const result = await getBestNtpSample(count);
      sendJson(res, 200, { ok: true, ...result, queriedAtMs: Date.now() });
    } catch (error) {
      sendJson(res, 503, {
        ok: false,
        error: error.message,
        queriedAtMs: Date.now(),
      });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
