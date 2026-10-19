<?php
// Canonical host redirect — runs before Next.js proxy (required on Lightning Stack; .htaccess is ignored).
$requestHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
$canonicalHost = 'www.asvab-tutoring.com';

if ($requestHost === 'asvab-tutoring.com') {
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    header('Location: https://' . $canonicalHost . $uri, true, 301);
    exit;
}

// Reverse proxy from Cloudways PHP -> Next.js on localhost:3001
$upstream = "http://127.0.0.1:3001";
$uri = $_SERVER['REQUEST_URI'] ?? "/";
$path = parse_url($uri, PHP_URL_PATH);

// 1) Serve real existing files directly instead of proxying them
$documentRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__, '/');
$localFile = realpath($documentRoot . $path);

if (
    $localFile !== false &&
    is_file($localFile) &&
    strpos($localFile, $documentRoot) === 0
) {
    return false;
}

// 2) Never let PHP try to handle Next static assets or common public assets.
//    Exception: /_next/image is a dynamic optimizer route and must be proxied.
$staticPrefixes = [
    '/_next/',
    '/images/',
    '/videos/',
];

$staticFiles = [
    '/favicon.ico',
    '/manifest.json',
];

$isNextImageOptimizer = strpos($path, '/_next/image') === 0;

if (!$isNextImageOptimizer) {
    foreach ($staticPrefixes as $prefix) {
        if (strpos($path, $prefix) === 0) {
            http_response_code(404);
            exit;
        }
    }
}

if (in_array($path, $staticFiles, true)) {
    http_response_code(404);
    exit;
}

// 3) Proxy all non-static requests to Next.js
$url = $upstream . $uri;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

$body = file_get_contents("php://input");
if ($body !== false && strlen($body) > 0) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$headers = [];
foreach ($_SERVER as $k => $v) {
    if (strpos($k, 'HTTP_') === 0) {
        $name = str_replace('_', '-', substr($k, 5));
        $lower = strtolower($name);

        if (in_array($lower, ['host', 'connection', 'content-length', 'x-forwarded-host'])) {
            continue;
        }

        $headers[] = $name . ": " . $v;
    }
}

$headers[] = "Host: 127.0.0.1:3001";
$headers[] = "X-Forwarded-Host: " . ($_SERVER['HTTP_HOST'] ?? "");
$headers[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) ? "https" : "http");
$headers[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? "");
$headers[] = "X-Real-IP: " . ($_SERVER['REMOTE_ADDR'] ?? "");

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header("Content-Type: text/plain; charset=utf-8");
    echo "Upstream error: " . curl_error($ch);
    curl_close($ch);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$respHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);
curl_close($ch);

http_response_code($status);

foreach (explode("\r\n", $respHeaders) as $line) {
    if (stripos($line, 'HTTP/') === 0) continue;
    if (trim($line) === '') continue;
    if (stripos($line, 'Transfer-Encoding:') === 0) continue;
    if (stripos($line, 'Connection:') === 0) continue;
    header($line, true);
}

echo $respBody;