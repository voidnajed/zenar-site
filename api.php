<?php
// Job Board API - bypasses HTTP caching
// Serves job listings and sources with no-cache headers

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Get requested resource
$resource = isset($_GET['resource']) ? $_GET['resource'] : 'listings';

if ($resource === 'listings') {
    $file = './data/job-listings.json';
} elseif ($resource === 'sources') {
    $file = './data/job-sources.json';
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid resource']);
    exit;
}

// Check file exists
if (!file_exists($file)) {
    http_response_code(404);
    echo json_encode(['error' => 'Resource not found']);
    exit;
}

// Read and output file with fresh headers
readfile($file);
?>
