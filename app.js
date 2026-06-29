// ============================================
// PROTECCIÓN: Verificar sesión activa
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
// ⚠️ CONFIGURACIÓN IMPORTANTE
// Pega aquí tu API Key de Google Gemini
// Obtén una en: https://aistudio.google.com/apikey
// ============================================
// La API Key se cargará desde el servidor (Coolify)
const GEMINI_API_KEY = 'AQ.Ab8RN6IIz00H-j556S5vBFdt7IeZUMuR_Xcu59g-CL_48Wljng';
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

// ============================================
// VARIABLES
// ============================================
let selectedTVType = null;

// ============================================
// SELECCIÓN DE TIPO DE TV
// ============================================
document.querySelectorAll('.btn-tv-type').forEach(function (button) {
    button.addEventListener('click', function () {
        // Quitar selección previa
        document.querySelectorAll('.btn-tv-type').forEach(function (btn) {
            btn.classList.remove('active');
        });

        // Marcar el seleccionado
        this.classList.add('active');
        selectedTVType = this.dataset.type;

        // Mostrar confirmación
        document.getElementById('tvTypeSelected').textContent = '✅ Seleccionó: TV ' + selectedTVType;
    });
});

// ============================================
// ENVÍO DEL FORMULARIO
// ============================================
document.getElementById('diagnosticForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validar que eligió tipo de TV
    if (!selectedTVType) {
        alert('⚠️ Por favor, primero seleccione el tipo de televisor (TRC o LCD/LED).');
        return;
    }

    const brand = document.getElementById('brand').value.trim();
    const model = document.getElementById('model').value.trim();
    const symptom = document.getElementById('symptom').value.trim();

    // Preparar sección de resultados
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const submitBtn = this.querySelector('button[type="submit"]');

    resultSection.style.display = 'block';
    resultContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>🔍 Consultando al asistente IA... Esto puede tardar unos segundos.</p></div>';
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Buscando...';

    // Scroll a resultados
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const prompt = buildPrompt(selectedTVType, brand, model, symptom);
        const response = await callGeminiAPI(prompt);

        resultContent.innerHTML = formatResponse(response);
    } catch (error) {
        resultContent.innerHTML =
            '<div style="color:#e74c3c;text-align:center;padding:20px;">' +
            '<p><strong>❌ Error al obtener respuesta</strong></p>' +
            '<p style="margin-top:10px;font-size:14px;">' + error.message + '</p>' +
            '<p style="margin-top:10px;font-size:14px;">Revise su conexión a internet e intente de nuevo.</p>' +
            '</div>';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🔍 Buscar Tip de Diagnóstico';
    }
});

// ============================================
// CONSTRUIR EL PROMPT PARA GEMINI
// ============================================
function buildPrompt(tvType, brand, model, symptom) {
    return (
        'Eres un asistente técnico experto en reparación de televisores. ' +
        'Un técnico reparador de electrodomésticos necesita tu orientación para diagnosticar un televisor.\n\n' +
        'DATOS DEL TELEVISOR:\n' +
        '- Tipo: ' + tvType + '\n' +
        '- Marca: ' + brand + '\n' +
        '- Modelo: ' + model + '\n' +
        '- Síntoma: ' + symptom + '\n\n' +
        'INSTRUCCIONES PARA TU RESPUESTA:\n' +
        '1. Sé cordial, saluda al técnico de forma respetuosa y cercana.\n' +
        '2. Usa un lenguaje sencillo, como si hablaras con un colega de confianza. Evita términos muy complejos sin explicarlos.\n' +
        '3. Organiza tu respuesta en pasos numerados claros (paso a paso).\n' +
        '4. NO inventes datos, modelos de componentes ni valores que no existan. Si no estás seguro de algo, dilo claramente.\n' +
        '5. Sé RESUMIDO: ve al grano, sin texto de relleno.\n' +
        '6. Menciona los componentes o secciones de la placa que debe revisar primero.\n' +
        '7. Si aplica, menciona valores típicos de voltaje o resistencia como referencia.\n' +
        '8. Incluye SIEMPRE una advertencia de seguridad al inicio (descargar capacitores, desconectar de la corriente, etc.).\n' +
        '9. Al final, da una recomendación general.\n\n' +
        'Responde ÚNICAMENTE en español.'
    );
}

// ============================================
// LLAMAR A LA API DE GEMINI
// ============================================
async function callGeminiAPI(prompt) {
    const response = await fetch(GEMINI_API_URL + '?key=' + GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.5,
                topK: 32,
                topP: 0.9,
                maxOutputTokens: 4096,
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error('Error del servidor (código ' + response.status + '). Verifique su API Key.');
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error('No se recibió una respuesta válida de Gemini.');
}

// ============================================
// FORMATEAR LA RESPUESTA DE GEMINI EN HTML
// ============================================
function formatResponse(text) {
    let html = '';
    const lines = text.split('\n');
    let inOl = false;
    let inUl = false;

    function closeLists() {
        let closing = '';
        if (inOl) { closing += '</ol>'; inOl = false; }
        if (inUl) { closing += '</ul>'; inUl = false; }
        return closing;
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line === '') {
            html += closeLists();
            continue;
        }

        // Detectar encabezados con # o ##
        if (line.startsWith('### ')) {
            html += closeLists();
            html += '<h3>' + applyInline(line.substring(4)) + '</h3>';
            continue;
        }
        if (line.startsWith('## ')) {
            html += closeLists();
            html += '<h3>' + applyInline(line.substring(3)) + '</h3>';
            continue;
        }
        if (line.startsWith('# ')) {
            html += closeLists();
            html += '<h3>' + applyInline(line.substring(2)) + '</h3>';
            continue;
        }

        // Detectar listas numeradas: "1. ", "2. ", etc.
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (olMatch) {
            if (inUl) { html += '</ul>'; inUl = false; }
            if (!inOl) { html += '<ol>'; inOl = true; }
            html += '<li>' + applyInline(olMatch[2]) + '</li>';
            continue;
        }

        // Detectar listas con guión o asterisco: "- texto" o "* texto"
        const ulMatch = line.match(/^[-*•]\s+(.*)/);
        if (ulMatch) {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (!inUl) { html += '<ul>'; inUl = true; }
            html += '<li>' + applyInline(ulMatch[1]) + '</li>';
            continue;
        }

        // Texto normal
        html += closeLists();
        html += '<p>' + applyInline(line) + '</p>';
    }

    html += closeLists();
    return html;
}

// Aplicar negritas (**texto**) y cursivas (*texto*)
function applyInline(text) {
    // Negritas: **texto**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Cursivas: *texto*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Código inline: `texto`
    text = text.replace(/`(.+?)`/g, '<code style="background:#e8e8e8;padding:2px 5px;border-radius:4px;font-size:14px;">$1</code>');
    return text;
}

// ============================================
// BOTÓN NUEVA BÚSQUEDA
// ============================================
document.getElementById('newSearchBtn').addEventListener('click', function () {
    document.getElementById('diagnosticForm').reset();
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('tvTypeSelected').textContent = '';
    document.querySelectorAll('.btn-tv-type').forEach(function (btn) {
        btn.classList.remove('active');
    });
    selectedTVType = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ============================================
// BOTÓN CERRAR SESIÓN
// ============================================
document.getElementById('logoutBtn').addEventListener('click', function () {
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
    
    // Prioridad: voz en español
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
    // Verificar soporte
    if (!('speechSynthesis' in window)) {
        alert('Tu navegador no soporta lectura de voz. Usa Chrome o Edge.');
        return;
    }
    
    if (!isSpeaking) {
        // ▶️ INICIAR LECTURA
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
        
        speechUtterance.rate = 0.95;  // Velocidad normal
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
        // ▶️ REANUDAR
        speechSynthesis.resume();
        btnVoice.querySelector('.voice-icon-simple').textContent = '⏸️';
        voiceLabel.textContent = 'Pausar';
        
    } else {
        // ⏸️ PAUSAR
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