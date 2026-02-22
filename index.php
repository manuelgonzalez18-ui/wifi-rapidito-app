<?php
// index.php - Redirección o Carga Directa para TuPortalISP
// Si el usuario ya cargó el nuevo index.html en la raíz, podemos servirlo directamente
// o redirigir a donde están los archivos finales.

// Por ahora, si el archivo index.html existe en la raíz, lo servimos.
if (file_exists("index.html")) {
    include("index.html");
    exit;
}

// Respaldo por si acaso
header("Location: /dist/tuportalisp/");
exit;
?>
