<?php
header('Content-Type: text/plain');
echo "ROOT FILES:\n";
print_r(glob("*"));
echo "\nASSETS FILES:\n";
print_r(glob("assets/*"));
?>
