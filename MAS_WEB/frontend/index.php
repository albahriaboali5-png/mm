<?php
// Only redirect if the request is not for the API or admin panel
$request_uri = $_SERVER['REQUEST_URI'];

if (strpos($request_uri, '/api/') === 0 || strpos($request_uri, '/admin/') === 0) {
    // Let the backend handle API and Django Admin routes
    return false; 
}

// MAS Web Dashboard is an HTML/JS SPA, so we redirect the base domain to login.html
header("Location: login.html");
exit();
?>
