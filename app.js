// ============================================
// 🔒 PROTECCIÓN: Verificar sesión activa
// ============================================
if (sessionStorage.getItem('userLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

// Mostrar nombre del usuario
const currentUser = sessionStorage.getItem('currentUser');
if (currentUser) {
    document.getElementById('welcomeUser').textContent = '👋 Hola, ' + currentUser;
}

// ============================================
// 🔧 CONFIGURACIÓN GROQ API
// ============================================
const GROQ_API_KEY = window.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Verificación
if (!GROQ_API_KEY) {
    console.warn('⚠️ API Key de Groq no configurada');
}

// ============================================
// 🎯 VARIABLES GLOBALES
// ============================================
let selectedTVType = null;

// ============================================
// 📺 SELECCIÓN DE TIPO DE TV
// ============================================
document.querySelectorAll('.btn-tv-type').forEach(function(button) {
    button.addEventListener('click', function() {
        document.querySelectorAll('.btn-tv-type').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        selectedTVType = this.dataset.type;
        document.getElementById('tvTypeSelected').textContent = '✅ Seleccionó: TV ' + selectedTVType;
    });
});

// ============================================
// 📤 ENVÍO DEL FORMULARIO
// ============================================
document.getElementById('diagnosticForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('📤 Formulario enviado');
    
    if (!selectedTVType) {
        alert('⚠️ Por favor, primero seleccione el tipo de televisor');
        return;
    }
    
    const brand = document.getElementById('brand').value.trim();
    const model = document.getElementById('model').value.trim();
    const symptom = document.getElementById('symptom').value.trim();
    
    console.log('📋 Datos:', { tvType: selectedTVType, brand, model, symptom });
    
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    
    resultSection.style.display = 'block';
    resultContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>🔍 Consultando al asistente IA...</p></div>';
    
    resultSection.scrollIntoView({ behavior: 'smooth' });
    
    try {
        console.log('🔨 Construyendo prompt...');
        const prompt = buildPrompt(selectedTVType, brand, model, symptom);
        console.log('📝 Prompt (primeros 200 chars):', prompt.substring(0, 200));
        
        console.log('🤖 Llamando a Groq...');
        const response = await callGroqAPI(prompt);
        
        console.log('✅ Respuesta recibida, formateando...');
        const html = formatResponse(response);
        console.log('📄 HTML generado (primeros 200 chars):', html.substring(0, 200));
        
        resultContent.innerHTML = html;
        console.log('✅ Resultado mostrado en pantalla');
        
    } catch (error) {
        console.error('🚨 Error en el submit:', error);
        resultContent.innerHTML = '<div style="color:#e74c3c;text-align:center;padding:20px;"><p><strong>❌ Error:</strong> ' + error.message + '</p></div>';
    }
});

// ============================================
// 📝 CONSTRUIR PROMPT PARA GROQ
// ============================================
function buildPrompt(tvType, brand, model, symptom) {
    return 'Eres un asistente técnico experto en reparación de televisores. ' +
        'Un técnico reparador de electrodomésticos necesita tu orientación para diagnosticar un televisor.\n\n' +
        'DATOS DEL TELEVISOR:\n' +
        '- Tipo: ' + tvType + '\n' +
        '- Marca: ' + brand + '\n' +
        '- Modelo: ' + model + '\n' +
        '- Síntoma: ' + symptom + '\n\n' +
        'INSTRUCCIONES PARA TU RESPUESTA:\n' +
        '1. Saluda cordialmente al colega técnico\n' +
        '2. Usa lenguaje sencillo y claro\n' +
        '3. Organiza el diagnóstico en pasos numerados\n' +
        '4. NO inventes datos técnicos\n' +
        '5. Sé RESUMIDO (máximo 300 palabras)\n' +
        '6. Incluye advertencia de seguridad eléctrica\n' +
        '7. Responde en español\n' +
        '8. Si no estás seguro, dilo claramente';
}

// ============================================
// 🤖 LLAMAR A GROQ API
// ============================================
async function callGroqAPI(prompt) {
    console.log('🔍 Iniciando llamada a Groq...');
    console.log('📡 Modelo:', GROQ_MODEL);
    console.log('🔑 API Key cargada:', GROQ_API_KEY ? '✅ Sí (' + GROQ_API_KEY.substring(0, 8) + '...)' : '❌ NO');
    
    if (!GROQ_API_KEY) {
        throw new Error('API Key de Groq no configurada. Verifica app.html');
    }
    
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GROQ_API_KEY
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente técnico experto en reparación de televisores. Respondes en español, de forma cordial, con pasos claros y numerados. Usas términos sencillos. No inventas datos.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 4096
            })
        });
        
        console.log('📥 Respuesta recibida. Status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error de Groq:', errorData);
            throw new Error('Error de Groq: ' + (errorData.error?.message || 'Código ' + response.status));
        }
        
        const data = await response.json();
        console.log('✅ Datos recibidos de Groq');
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const text = data.choices[0].message.content;
            console.log('📝 Texto extraído (primeros 100 chars):', text.substring(0, 100));
            return text;
        }
        
        throw new Error('Respuesta inesperada de Groq');
        
    } catch (error) {
        console.error('🚨 Error en callGroqAPI:', error);
        throw error;
    }
}

// ============================================
// 📄 FORMATEAR RESPUESTA EN HTML
// ============================================
function formatResponse(text) {
    let html = '';
    const lines = text.split('\n');
    let inOl = false, inUl = false;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (inUl) { html += '</ul>'; inUl = false; }
            continue;
        }
        
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (inUl) { html += '</ul>'; inUl = false; }
            html += '<h3>' + line.replace(/^#+\s/, '') + '</h3>';
        } else if (/^\d+\.\s/.test(line)) {
            if (inUl) { html += '</ul>'; inUl = false; }
            if (!inOl) { html += '<ol>'; inOl = true; }
            html += '<li>' + line.replace(/^\d+\.\s/, '') + '</li>';
        } else if (/^[-*•]\s/.test(line)) {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (!inUl) { html += '<ul>'; inUl = true; }
            html += '<li>' + line.replace(/^[-*•]\s/, '') + '</li>';
        } else {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (inUl) { html += '</ul>'; inUl = false; }
            html += '<p>' + line + '</p>';
        }
    }
    if (inOl) html += '</ol>';
    if (inUl) html += '</ul>';
    return html;
}

// ============================================
// 🔄 BOTÓN NUEVA BÚSQUEDA
// ============================================
document.getElementById('newSearchBtn').addEventListener('click', function() {
    document.getElementById('diagnosticForm').reset();
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('tvTypeSelected').textContent = '';
    document.querySelectorAll('.btn-tv-type').forEach(btn => btn.classList.remove('active'));
    selectedTVType = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ============================================
// 🚪 BOTÓN CERRAR SESIÓN
// ============================================
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('¿Está seguro que desea salir?')) {
        sessionStorage.removeItem('userLoggedIn');
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
});

// ============================================
// 🔊 LECTOR DE VOZ SIMPLE
// ============================================
let speechUtterance = null;
let isSpeaking = false;
let spanishVoice = null;

const btnVoice = document.getElementById('btnVoice');
const voiceLabel = document.getElementById('voiceLabel');

// Cargar voces y buscar una en español
function loadSpanishVoice() {
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return;
    
    spanishVoice = voices.find(v => v.lang.startsWith('es-MX')) ||
                   voices.find(v => v.lang.startsWith('es-ES')) ||
                   voices.find(v => v.lang.startsWith('es-US')) ||
                   voices.find(v => v.lang.startsWith('es')) ||
                   voices[0];
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadSpanishVoice;
}
setTimeout(loadSpanishVoice, 500);

// Extraer texto plano del HTML
function getTextFromHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    let text = temp.textContent || temp.innerText || '';
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 5000) {
        text = text.substring(0, 5000) + '... Fin del diagnóstico.';
    }
    return text;
}

// Resetear estado del botón
function resetVoiceButton() {
    isSpeaking = false;
    btnVoice.classList.remove('playing');
    btnVoice.querySelector('.voice-icon-simple').textContent = '🔊';
    voiceLabel.textContent = 'Escuchar diagnóstico';
}

// Botón único: Escuchar / Pausar / Reanudar
btnVoice.addEventListener('click', function() {
    if (!('speechSynthesis' in window)) {
        alert('Tu navegador no soporta lectura de voz. Usa Chrome o Edge.');
        return;
    }
    
    if (!isSpeaking) {
        const resultContent = document.getElementById('resultContent');
        const text = getTextFromHTML(resultContent.innerHTML);
        
        if (!text || text.trim() === '') {
            alert('No hay texto para leer.');
            return;
        }
        
        speechSynthesis.cancel();
        speechUtterance = new SpeechSynthesisUtterance(text);
        
        if (spanishVoice) {
            speechUtterance.voice = spanishVoice;
        }
        
        speechUtterance.rate = 0.95;
        speechUtterance.pitch = 1;
        speechUtterance.volume = 1;
        speechUtterance.lang = 'es-ES';
        
        speechUtterance.onstart = function() {
            isSpeaking = true;
            btnVoice.classList.add('playing');
            btnVoice.querySelector('.voice-icon-simple').textContent = '⏸️';
            voiceLabel.textContent = 'Pausar';
        };
        
        speechUtterance.onend = function() {
            resetVoiceButton();
        };
        
        speechUtterance.onerror = function(event) {
            if (event.error !== 'canceled') {
                console.error('Error de voz:', event);
            }
            resetVoiceButton();
        };
        
        speechSynthesis.speak(speechUtterance);
        
    } else if (speechSynthesis.paused) {
        speechSynthesis.resume();
        btnVoice.querySelector('.voice-icon-simple').textContent = '⏸️';
        voiceLabel.textContent = 'Pausar';
        
    } else {
        speechSynthesis.pause();
        btnVoice.querySelector('.voice-icon-simple').textContent = '▶️';
        voiceLabel.textContent = 'Reanudar';
    }
});

// Detener al hacer nueva búsqueda
document.getElementById('newSearchBtn').addEventListener('click', function() {
    speechSynthesis.cancel();
    resetVoiceButton();
});

// Detener al salir de la página
window.addEventListener('beforeunload', function() {
    speechSynthesis.cancel();
});

// Workaround para Chrome (bug de 15 segundos)
setInterval(() => {
    if (isSpeaking && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        speechSynthesis.resume();
    }
}, 10000);