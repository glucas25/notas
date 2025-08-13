// URL de tu Google Sheet configurada como CSV
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6KGWK1pBH2_6EiBi6sDBwRuC-3vyXvXZ25URB4znpJ3XXTJ5qFxDxT2BJ1hFkn6lgKCfNW70UDifN/pub?gid=1151777655&single=true&output=csv';

let studentData = [];
let lastUpdateTime = null;
let isAdminLoggedIn = false;

// Credenciales de administrador
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123!'
};

// Cargar datos automáticamente al inicio
window.addEventListener('load', function() {
    loadData();
});

// Funciones de administrador
function openAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
}
function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
}
function loginAdmin(event) {
    event.preventDefault();
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        isAdminLoggedIn = true;
        document.getElementById('adminPanel').style.display = 'block';
        closeAdminModal();
        showSuccessMessage('Sesión administrativa iniciada correctamente');
        if (studentData.length > 0) {
            updateStatistics();
        }
    } else {
        showErrorMessage('Credenciales incorrectas. Verifique usuario y contraseña.');
    }
}
function logoutAdmin() {
    isAdminLoggedIn = false;
    document.getElementById('adminPanel').style.display = 'none';
    showSuccessMessage('Sesión administrativa cerrada');
}

// Cargar datos desde Google Sheets
async function loadData() {
    showLoading();
    hideMessages();
    if (isAdminLoggedIn) {
        document.getElementById('refreshBtn').disabled = true;
    }
    try {
        // Agregar timestamp para evitar cache
        const url = GOOGLE_SHEET_URL + '&t=' + new Date().getTime();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const csvText = await response.text();
        // Parsear CSV con PapaParse
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: function(header) {
                // Limpiar encabezados
                return header.trim();
            },
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.warn('Errores en el CSV:', results.errors);
                }
                studentData = results.data.filter(row => {
                    // Filtrar filas que tengan al menos ID_STD
                    return row['ID_STD'] && row['ID_STD'].toString().trim() !== '';
                });
                lastUpdateTime = new Date();
                hideLoading();
                // Mostrar estadísticas solo si admin está logueado
                if (isAdminLoggedIn) {
                    updateStatistics();
                    showSuccessMessage(`Datos actualizados: ${studentData.length} registros cargados.`);
                }
                console.log('Datos cargados:', studentData.slice(0, 3)); // Mostrar primeros 3 registros
                console.log('Columnas detectadas:', Object.keys(studentData[0] || {}));
            },
            error: function(error) {
                throw new Error('Error al parsear CSV: ' + error.message);
            }
        });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        hideLoading();
        if (isAdminLoggedIn) {
            showErrorMessage('No se pudieron cargar los datos. Verifique la conexión a internet y que el enlace de Google Sheets sea válido.');
        }
    } finally {
        if (isAdminLoggedIn) {
            document.getElementById('refreshBtn').disabled = false;
        }
    }
}
// Actualizar estadísticas
function updateStatistics() {
    if (studentData.length === 0) return;
    const uniqueStudents = [...new Set(studentData.map(row => row['ID_STD']))].length;
    const totalSubjects = [...new Set(studentData.map(row => row['ASIGNATURA']))].filter(s => s).length;
    document.getElementById('totalRecords').textContent = studentData.length;
    document.getElementById('uniqueStudents').textContent = uniqueStudents;
    document.getElementById('totalSubjects').textContent = totalSubjects;
    document.getElementById('lastUpdate').textContent = lastUpdateTime.toLocaleTimeString();
}
// Buscar estudiante por cédula
function buscarEstudiante() {
    const cedula = document.getElementById('cedulaInput').value.trim();
    if (!cedula) {
        showErrorMessage('Por favor ingrese un número de cédula');
        return;
    }
    if (studentData.length === 0) {
        showErrorMessage('Los datos no están disponibles. Intente nuevamente en unos momentos.');
        // Cargar datos automáticamente
        loadData();
        return;
    }
    showLoading();
    document.getElementById('loadingText').textContent = 'Buscando estudiante...';
    hideMessages();
    setTimeout(() => {
        try {
            // Buscar estudiante por cédula (convertir ambos a string para comparación)
            const studentRecords = studentData.filter(record => {
                const idStd = record['ID_STD'] ? record['ID_STD'].toString().trim() : '';
                return idStd === cedula;
            });
            hideLoading();
            if (studentRecords.length === 0) {
                showErrorMessage(`No se encontró ningún estudiante con la cédula: ${cedula}`);
                return;
            }
            // Mostrar información del estudiante
            mostrarInformacionEstudiante(studentRecords[0]);
            // Mostrar calificaciones
            mostrarCalificaciones(studentRecords);
            // Mostrar sección de resultados
            document.getElementById('resultsSection').style.display = 'block';
            showSuccessMessage(`Estudiante encontrado: ${studentRecords[0]['APELLIDOS Y NOMBRES'] || 'Sin nombre'}`);
        } catch (error) {
            hideLoading();
            showErrorMessage('Error en la búsqueda: ' + error.message);
            console.error('Error:', error);
        }
    }, 500);
}
// Mostrar información del estudiante
function mostrarInformacionEstudiante(studentRecord) {
    document.getElementById('studentName').textContent = studentRecord['APELLIDOS Y NOMBRES'] || '-';
    document.getElementById('studentId').textContent = studentRecord['ID_STD'] || '-';
    document.getElementById('studentSubnivel').textContent = studentRecord['SUBNIVEL'] || '-';
    document.getElementById('studentCurso').textContent = studentRecord['CURSO'] || '-';
    document.getElementById('studentParalelo').textContent = studentRecord['PARALELO'] || '-';
    document.getElementById('studentPeriodo').textContent = studentRecord['PERIODO LECTIVO'] || '-';
}
// Mostrar calificaciones
function mostrarCalificaciones(studentRecords) {
    const tableBody = document.getElementById('gradesTableBody');
    tableBody.innerHTML = '';
    studentRecords.forEach(record => {
        const row = document.createElement('tr');
        const asignatura = record['ASIGNATURA'] || '-';
        const docente = record['DOCENTE'] || '-';
        // Asegurar que los valores sean numéricos o '-' si están vacíos
        const trim1 = (record['TRIM-1'] && !isNaN(record['TRIM-1'])) ? record['TRIM-1'] : (record['TRIM-1'] === '0' ? '0' : '-');
        const trim2 = (record['TRIM-2'] && !isNaN(record['TRIM-2'])) ? record['TRIM-2'] : (record['TRIM-2'] === '0' ? '0' : '-');
        const trim3 = (record['TRIM-3'] && !isNaN(record['TRIM-3'])) ? record['TRIM-3'] : (record['TRIM-3'] === '0' ? '0' : '-');
        // Priorizar PROMEDIO si es válido, luego PROM
        let promedio = '-';
        if (record['PROMEDIO'] && !isNaN(record['PROMEDIO'])) {
            promedio = record['PROMEDIO'];
        } else if (record['PROM'] && !isNaN(record['PROM'])) {
            promedio = record['PROM'];
        } else if (record['PROMEDIO'] === '0' || record['PROM'] === '0') {
            promedio = '0';
        }
        const estado = record['ESTADO'] || '-';
        // Función para formatear notas
        function formatGrade(grade) {
            if (grade === '-' || grade === '' || grade === null || typeof grade === 'undefined') return '-';
            if (isNaN(grade)) return grade;
            const nota = parseFloat(grade);
            let gradeClass = '';
            if (nota >= 9) gradeClass = 'grade-excellent';
            else if (nota >= 7) gradeClass = 'grade-good';
            else if (nota >= 5) gradeClass = 'grade-regular';
            else gradeClass = 'grade-poor';
            return `<span class="grade-cell ${gradeClass}">${nota.toFixed(1)}</span>`;
        }
        row.innerHTML = `
            <td><strong>${asignatura}</strong></td>
            <td>${docente}</td>
            <td>${formatGrade(trim1)}</td>
            <td>${formatGrade(trim2)}</td>
            <td>${formatGrade(trim3)}</td>
            <td>${formatGrade(promedio)}</td>
            <td><strong>${estado}</strong></td>
        `;
        tableBody.appendChild(row);
    });
}
// Funciones de UI
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('searchBtn').disabled = true;
}
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('searchBtn').disabled = false;
    document.getElementById('loadingText').textContent = 'Cargando datos desde Google Sheets...';
}
function showErrorMessage(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 8000);
}
function showSuccessMessage(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}
function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}
// Event listeners
// Buscar con Enter
document.getElementById('cedulaInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        buscarEstudiante();
    }
});
// Limpiar resultados cuando se cambia la cédula
document.getElementById('cedulaInput').addEventListener('input', function() {
    document.getElementById('resultsSection').style.display = 'none';
    hideMessages();
});
// --- Modo oscuro manual ---
const themeToggle = document.getElementById('themeToggle');
function setTheme(theme) {
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        document.body.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
    }
    localStorage.setItem('theme', theme);
}
function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
}
themeToggle.addEventListener('click', toggleTheme);
(function() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        setTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
})();
// Auto-actualizar datos cada 10 minutos (solo si admin está logueado)
setInterval(function() {
    if (studentData.length > 0 && isAdminLoggedIn) {
        console.log('Auto-actualizando datos...');
        loadData();
    }
}, 10 * 60 * 1000); // 10 minutos
// Cerrar modal al hacer clic fuera
document.getElementById('adminModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeAdminModal();
    }
});
// Cargar datos y tema al inicio
window.addEventListener('load', function() {
    // loadData(); // Ya se llama arriba
});