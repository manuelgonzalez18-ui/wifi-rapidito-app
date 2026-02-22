<?php
header('Content-Type: text/plain');
echo "--- HOSTINGER DIAGNOSTIC ---\n";
echo "Current File: " . __FILE__ . "\n";
echo "Root Path: " . $_SERVER['DOCUMENT_ROOT'] . "\n\n";

$check_files = [
    'index.html',
    'index.php',
    'assets/index-B4m4d87B.js',
    'assets/index-Duml3LiC.css'
];

foreach ($check_files as $file) {
    if (file_exists($file)) {
        echo "[FOUND] $file (" . filesize($file) . " bytes)\n";
        if (strpos($file, '.js') !== false) {
            echo "First 50 chars of JS: " . substr(file_get_contents($file), 0, 50) . "...\n";
        }
    } else {
        echo "[MISSING] $file\n";
    }
}

echo "\n--- DIR LISTING (assets/) ---\n";
if (is_dir('assets')) {
    print_r(scandir('assets'));
} else {
    echo "assets/ directory NOT FOUND\n";
}

echo "\n--- HTACCESS CONTENT ---\n";
if (file_exists('.htaccess')) {
    echo file_get_contents('.htaccess');
} else {
    echo ".htaccess NOT FOUND\n";
}
?>
