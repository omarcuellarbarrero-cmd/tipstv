<?php
// ============================================
// 🔐 PROXY SEGURO PARA GROQ API
// La API Key se lee de las variables de entorno de Coolify
// ============================================

// Headers CORS y seguridad
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// Manejar preflight requests (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Solo se permite POST']);
    exit;
}

// ============================================
// 🔑 LEER API KEY DESDE VARIABLES DE ENTORNO
// ============================================
$GROQ_API_KEY = getenv('GROQ_API_KEY');

// Verificar que la variable exista
if (!$GROQ_API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'La API Key no está configurada en el servidor']);
    exit;
}

$GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
$GROQ_MODEL = 'llama-3.3-70b-versatile';

// ============================================
// 📥 RECIBER DATOS DEL FRONTEND
// ============================================
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta el prompt']);
    exit;
}

$prompt = $input['prompt'];

// Validar longitud del prompt
if (strlen($prompt) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt demasiado largo (máximo 5000 caracteres)']);
    exit;
}

// ============================================
// 🤖 LLAMAR A GROQ API
// ============================================
$data = [
    'model' => $GROQ_MODEL,
    'messages' => [
        [
            'role' => 'system',
            'content' => 'Eres un asistente técnico experto en reparación de televisores. Respondes en español, de forma cordial, con pasos claros y numerados. Usas términos sencillos. No inventas datos.'
        ],
        [
            'role' => 'user',
            'content' => $prompt
        ]
    ],
    'temperature' => 0.5,
    'max_tokens' => 4096
];

$ch = curl_init($GROQ_API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $GROQ_API_KEY
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// ============================================
// 📤 DEVOLVER RESPUESTA AL FRONTEND
// ============================================
if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $error]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo $response;
    exit;
}

// Extraer solo el texto de la respuesta
$groqResponse = json_decode($response, true);
$text = $groqResponse['choices'][0]['message']['content'] ?? '';

echo json_encode([
    'success' => true,
    'text' => $text
]);
