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
// 🔊 LECTOR DE VOZ (TEXT-TO-SPEECH)
// ============================================

// Variables globales para el lector
let speechUtterance = null;
let isSpeaking = false;
let isPaused = false;
let availableVoices = [];

// Elementos del DOM
const btnPlayPause = document.getElementById('btnPlayPause');
const btnStop = document.getElementById('btnStop');
const voiceSelect = document.getElementById('voiceSelect');
const rateSelect = document.getElementById('rateSelect');
const voiceStatus = document.getElementById('voiceStatus');

// ============================================
// Cargar voces disponibles
// ============================================
function loadVoices() {
    availableVoices = speechSynthesis.getVoices();
    
    if (availableVoices.length === 0) return;
    
    // Limpiar selector
    voiceSelect.innerHTML = '';
    
    // Filtrar voces en español primero
    const spanishVoices = availableVoices.filter(v => 
        v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish')
    );
    const otherVoices = availableVoices.filter(v => 
        !v.lang.startsWith('es') && !v.name.toLowerCase().includes('spanish')
    );
    
    // Agregar voces en español primero
    if (spanishVoices.length > 0) {
        const optGroupSpanish = document.createElement('optgroup');
        optGroupSpanish.label = '🇪🇸 Español';
        spanishVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = availableVoices.indexOf(voice);
            option.textContent = `${voice.name} (${voice.lang})`;
            if (index === 0) option.selected = true;
            optGroupSpanish.appendChild(option);
        });
        voiceSelect.appendChild(optGroupSpanish);
    }
    
    // Agregar otras voces
    if (otherVoices.length > 0) {
        const optGroupOther = document.createElement('optgroup');
        optGroupOther.label = '🌍 Otros idiomas';
        otherVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = availableVoices.indexOf(voice);
            option.textContent = `${voice.name} (${voice.lang})`;
            optGroupOther.appendChild(option);
        });
        voiceSelect.appendChild(optGroupOther);
    }
    
    setStatus('✅ Voces cargadas: ' + availableVoices.length + ' disponibles', 'success');
}

// Cargar voces cuando estén disponibles
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices(); // Intentar cargar inmediatamente

// ============================================
// Función para mostrar mensajes de estado
// ============================================
function setStatus(message, type = '') {
    voiceStatus.textContent = message;
    voiceStatus.className = 'voice-status ' + type;
    
    // Limpiar mensaje después de 4 segundos (excepto errores)
    if (type !== 'error') {
        setTimeout(() => {
            if (voiceStatus.textContent === message) {
                voiceStatus.textContent = '';
            }
        }, 4000);
    }
}

// ============================================
// Extraer texto plano del HTML (quitar etiquetas)
// ============================================
function getTextFromHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Reemplazar saltos de línea y puntos por pausas naturales
    let text = temp.textContent || temp.innerText || '';
    
    // Limpiar espacios múltiples
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limitar longitud (algunos navegadores tienen límites)
    if (text.length > 5000) {
        text = text.substring(0, 5000) + '... Fin del diagnóstico.';
    }
    
    return text;
}

// ============================================
// Botón Escuchar / Pausar
// ============================================
btnPlayPause.addEventListener('click', function() {
    if (!isSpeaking) {
        // Iniciar lectura
        startSpeaking();
    } else if (isPaused) {
        // Reanudar
        speechSynthesis.resume();
        isPaused = false;
        updatePlayButton(true);
        setStatus('▶️ Reproduciendo...', 'success');
    } else {
        // Pausar
        speechSynthesis.pause();
        isPaused = true;
        updatePlayButton(false);
        setStatus('⏸️ En pausa', '');
    }
});

// ============================================
// Iniciar la lectura
// ============================================
function startSpeaking() {
    const resultContent = document.getElementById('resultContent');
    const text = getTextFromHTML(resultContent.innerHTML);
    
    if (!text || text.trim() === '') {
        setStatus('❌ No hay texto para leer', 'error');
        return;
    }
    
    // Verificar soporte del navegador
    if (!('speechSynthesis' in window)) {
        setStatus('❌ Tu navegador no soporta lectura de voz. Usa Chrome o Edge.', 'error');
        btnPlayPause.disabled = true;
        return;
    }
    
    // Cancelar cualquier lectura previa
    speechSynthesis.cancel();
    
    // Crear nuevo utterance
    speechUtterance = new SpeechSynthesisUtterance(text);
    
    // Configurar voz seleccionada
    const selectedVoiceIndex = voiceSelect.value;
    if (availableVoices[selectedVoiceIndex]) {
        speechUtterance.voice = availableVoices[selectedVoiceIndex];
    }
    
    // Configurar parámetros
    speechUtterance.rate = parseFloat(rateSelect.value);
    speechUtterance.pitch = 1;
    speechUtterance.volume = 1;
    speechUtterance.lang = 'es-ES';
    
    // Eventos
    speechUtterance.onstart = function() {
        isSpeaking = true;
        isPaused = false;
        updatePlayButton(true);
        btnStop.disabled = false;
        setStatus('🔊 Leyendo el diagnóstico...', 'success');
    };
    
    speechUtterance.onend = function() {
        resetVoiceState();
        setStatus('✅ Lectura finalizada', 'success');
    };
    
    speechUtterance.onerror = function(event) {
        console.error('Error de voz:', event);
        resetVoiceState();
        if (event.error !== 'canceled') {
            setStatus('❌ Error al leer: ' + event.error, 'error');
        }
    };
    
    speechUtterance.onpause = function() {
        isPaused = true;
        updatePlayButton(false);
        setStatus('⏸️ En pausa', '');
    };
    
    speechUtterance.onresume = function() {
        isPaused = false;
        updatePlayButton(true);
        setStatus('▶️ Reproduciendo...', 'success');
    };
    
    // Iniciar lectura
    speechSynthesis.speak(speechUtterance);
}

// ============================================
// Botón Detener
// ============================================
btnStop.addEventListener('click', function() {
    speechSynthesis.cancel();
    resetVoiceState();
    setStatus('⏹️ Lectura detenida', '');
});

// ============================================
// Actualizar estado del botón Play/Pause
// ============================================
function updatePlayButton(playing) {
    if (playing) {
        btnPlayPause.classList.add('playing');
        btnPlayPause.querySelector('.voice-icon').textContent = '⏸️';
        btnPlayPause.querySelector('.voice-label').textContent = 'Pausar';
    } else {
        btnPlayPause.classList.remove('playing');
        btnPlayPause.querySelector('.voice-icon').textContent = '▶️';
        btnPlayPause.querySelector('.voice-label').textContent = 'Reanudar';
    }
}

// ============================================
// Resetear estado del lector
// ============================================
function resetVoiceState() {
    isSpeaking = false;
    isPaused = false;
    btnPlayPause.classList.remove('playing');
    btnPlayPause.querySelector('.voice-icon').textContent = '🔊';
    btnPlayPause.querySelector('.voice-label').textContent = 'Escuchar';
    btnStop.disabled = true;
}

// ============================================
// Detener lectura al hacer "Nueva Búsqueda"
// ============================================
const originalNewSearchHandler = document.getElementById('newSearchBtn').onclick;
document.getElementById('newSearchBtn').addEventListener('click', function() {
    speechSynthesis.cancel();
    resetVoiceState();
});

// ============================================
// Detener lectura al salir de la página
// ============================================
window.addEventListener('beforeunload', function() {
    speechSynthesis.cancel();
});

// ============================================
// Workaround para bug de Chrome (se detiene después de 15 seg)
// ============================================
let resumeTimer = null;
function startResumeTimer() {
    resumeTimer = setInterval(() => {
        if (isSpeaking && !isPaused && speechSynthesis.speaking) {
            speechSynthesis.pause();
            speechSynthesis.resume();
        }
    }, 10000);
}

// Iniciar workaround cuando empieza a hablar
const originalOnStart = speechUtterance ? speechUtterance.onstart : null;
window.addEventListener('load', function() {
    // El workaround se activa automáticamente al hablar
});

// ============================================
// Verificar soporte al cargar
// ============================================
window.addEventListener('load', function() {
    if (!('speechSynthesis' in window)) {
        setStatus('⚠️ Tu navegador no soporta lectura de voz', 'error');
        btnPlayPause.disabled = true;
        btnStop.disabled = true;
    } else {
        // Cargar voces después de un pequeño delay (algunos navegadores las cargan tarde)
        setTimeout(loadVoices, 500);
    }
});