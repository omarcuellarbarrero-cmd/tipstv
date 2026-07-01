<?php
// ============================================
// 🔐 PROXY SEGURO PARA GROQ API
// ============================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Solo POST']); exit; }

// 🔑 LEER LA API KEY DESDE LAS VARIABLES DE ENTORNO DE COOLIFY
$GROQ_API_KEY = getenv('GROQ_API_KEY');

// Verificar que la variable exista
if (!$GROQ_API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'La API Key no está configurada en el servidor']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['prompt'])) { http_response_code(400); echo json_encode(['error' => 'Falta prompt']); exit; }

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'llama-3.3-70b-versatile',
    'messages' => [
        ['role' => 'system', 'content' => 'Eres un asistente técnico experto en TVs.'],
        ['role' => 'user', 'content' => $input['prompt']]
    ],
    'temperature' => 0.5, 'max_tokens' => 4096
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer ' . $GROQ_API_KEY]);
$response = curl_exec($ch); curl_close($ch);

$groq = json_decode($response, true);
echo json_encode(['success' => true, 'text' => $groq['choices'][0]['message']['content'] ?? '']);
