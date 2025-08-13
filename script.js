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
    // Agregar clases de animación a elementos
    document.querySelector('.search-section').classList.add('fade-in');
});

// Funciones de administrador
function openAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('adminUser').focus();
    }, 300);
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
        document.getElementById('adminPanel').classList.add('fade-in');
        closeAdminModal();
        showSuccessMessage('Sesión administrativa iniciada correctamente');
        
        // Actualizar estadísticas si hay datos
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
    
    // Animación de números
    animateCounter('totalRecords', studentData.length);
    animateCounter('uniqueStudents', uniqueStudents);
    animateCounter('totalSubjects', totalSubjects);
    document.getElementById('lastUpdate').textContent = lastUpdateTime.toLocaleTimeString();
}

// Animación de contador
function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    const start = parseInt(element.textContent) || 0;
    const duration = 1000;
    const increment = (target - start) / (duration / 16);
    
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
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

            // Debug: mostrar qué registros se encontraron
            console.log('Registros encontrados para cédula', cedula, ':', studentRecords);

            // Mostrar información del estudiante
            mostrarInformacionEstudiante(studentRecords[0]);
            
            // Mostrar calificaciones
            mostrarCalificaciones(studentRecords);
            
            // Mostrar sección de resultados con animación
            const resultsSection = document.getElementById('resultsSection');
            resultsSection.style.display = 'block';
            resultsSection.classList.add('fade-in');
            
            showSuccessMessage(`Estudiante encontrado: ${studentRecords[0]['APELLIDOS Y NOMBRES'] || 'Sin nombre'}`);

            // Scroll suave hacia los resultados
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);

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

// Mostrar calificaciones - FUNCIÓN CORREGIDA
function mostrarCalificaciones(studentRecords) {
    const tableBody = document.getElementById('gradesTableBody');
    tableBody.innerHTML = '';

    console.log('=== DEBUG: Registros del estudiante ===');
    console.log('Cantidad de registros:', studentRecords.length);
    console.log('Datos completos:', studentRecords);

    studentRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.1}s`;
        
        const asignatura = record['ASIGNATURA'] || '-';
        const docente = record['DOCENTE'] || '-';
        
        // Debug: mostrar todos los campos de notas disponibles
        console.log(`\n--- ${asignatura} ---`);
        console.log('Campos disponibles:', Object.keys(record));
        console.log('TRIM-1 original:', record['TRIM-1'], 'tipo:', typeof record['TRIM-1']);
        console.log('TRIM-2 original:', record['TRIM-2'], 'tipo:', typeof record['TRIM-2']);
        console.log('TRIM-3 original:', record['TRIM-3'], 'tipo:', typeof record['TRIM-3']);
        console.log('PROMEDIO original:', record['PROMEDIO'], 'tipo:', typeof record['PROMEDIO']);
        console.log('PROM original:', record['PROM'], 'tipo:', typeof record['PROM']);
        
        // Función para limpiar y validar notas - MEJORADA
        function cleanGrade(value) {
            // Si es undefined, null o string vacío
            if (value === undefined || value === null || value === '') {
                return null;
            }
            
            // Convertir a string y limpiar espacios
            let cleanValue = value.toString().trim();
            
            // Si está vacío después de limpiar
            if (cleanValue === '' || cleanValue === 'undefined' || cleanValue === 'null') {
                return null;
            }
            
            // Si es un número válido (incluyendo 0)
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue)) {
                return numValue;
            }
            
            return null;
        }

        // Obtener notas limpias
        const trim1 = cleanGrade(record['TRIM-1']);
        const trim2 = cleanGrade(record['TRIM-2']);
        const trim3 = cleanGrade(record['TRIM-3']);
        
        // Buscar promedio (priorizar PROMEDIO sobre PROM)
        let promedio = cleanGrade(record['PROMEDIO']);
        if (promedio === null) {
            promedio = cleanGrade(record['PROM']);
        }
        
        const estado = record['ESTADO'] || '-';

        // Debug: mostrar valores procesados
        console.log('Valores procesados:');
        console.log('trim1:', trim1);
        console.log('trim2:', trim2);
        console.log('trim3:', trim3);
        console.log('promedio:', promedio);

        // Función para formatear notas en la tabla
        function formatGrade(nota) {
            if (nota === null || nota === undefined) {
                return '<span class="grade-cell" style="background: #e5e7eb; color: #6b7280; border: 1px solid #d1d5db;">-</span>';
            }
            
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
    
    console.log('=== FIN DEBUG ===\n');
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
    errorDiv.classList.add('fade-in');
    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.classList.remove('fade-in');
    }, 8000);
}

function showSuccessMessage(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    successDiv.classList.add('fade-in');
    setTimeout(() => {
        successDiv.style.display = 'none';
        successDiv.classList.remove('fade-in');
    }, 3000);
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Event listeners mejorados
document.addEventListener('DOMContentLoaded', function() {
    // Buscar con Enter
    document.getElementById('cedulaInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarEstudiante();
        }
    });

    // Limpiar resultados cuando se cambia la cédula
    document.getElementById('cedulaInput').addEventListener('input', function() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'none';
        resultsSection.classList.remove('fade-in');
        hideMessages();
    });

    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAdminModal();
        }
    });

    // Cerrar modal al hacer clic fuera
    document.getElementById('adminModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAdminModal();
        }
    });
});

// Auto-actualizar datos cada 10 minutos (solo si admin está logueado)
setInterval(function() {
    if (studentData.length > 0 && isAdminLoggedIn) {
        console.log('Auto-actualizando datos...');
        loadData();
    }
}, 10 * 60 * 1000); // 10 minutos

// Función de debug para mostrar estructura de datos
function debugStudentData(cedula) {
    console.log('=== DEBUGGING DATOS DEL ESTUDIANTE ===');
    const records = studentData.filter(record => {
        const idStd = record['ID_STD'] ? record['ID_STD'].toString().trim() : '';
        return idStd === cedula;
    });
    
    console.log(`Registros encontrados para cédula ${cedula}:`, records.length);
    
    records.forEach((record, index) => {
        console.log(`\nRegistro ${index + 1}:`);
        console.log('Asignatura:', record['ASIGNATURA']);
        console.log('Todas las propiedades:');
        Object.keys(record).forEach(key => {
            if (key.includes('TRIM') || key.includes('PROM') || key === 'ESTADO') {
                console.log(`  ${key}: "${record[key]}" (tipo: ${typeof record[key]})`);
            }
        });
    });
    
    console.log('=== FIN DEBUGGING ===');
}

// Función helper para probar en consola
window.debugStudentData = debugStudentData;