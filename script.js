/**
 * CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
 * ----------------------------------------
 * En esta sección definimos las variables principales que usaremos en toda la aplicación
 */

// Esta es la URL donde está publicada nuestra hoja de Google Sheets como CSV
// El formato CSV es como una tabla de Excel pero en texto plano, más fácil de procesar
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHavXVZRWfLBb3ShB2Xc8BpowBE5UU0vbNt6hDkUuoNMyKxWyCRSZmQMmAuvX-7OpjpMmfWHIRdpsN/pub?gid=1366029331&single=true&output=csv';
// Variables globales que usaremos en toda la aplicación
let studentData = [];        // Aquí guardaremos todos los datos de los estudiantes
let lastUpdateTime = null;   // Guarda la última vez que actualizamos los datos
let isAdminLoggedIn = false; // Controla si el administrador ha iniciado sesión

// Objeto con las credenciales del administrador
// En un sistema real, esto debería estar en el servidor por seguridad
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123!'
};

/**
 * INICIALIZACIÓN DE LA APLICACIÓN
 * ------------------------------
 * Este evento se dispara cuando la página termina de cargar
 */
window.addEventListener('load', function() {
    // Cargamos los datos inmediatamente al abrir la página
    loadData();
    
    // Agregamos una animación suave a la sección de búsqueda
    // La clase 'fade-in' hace que el elemento aparezca gradualmente
    document.querySelector('.search-section').classList.add('fade-in');
});

/**
 * FUNCIONES DE ADMINISTRACIÓN
 * --------------------------
 * Este grupo de funciones maneja todo lo relacionado con el panel de administrador
 */

/**
 * Abre el modal (ventana flotante) de inicio de sesión del administrador
 * setTimeout: espera 300 milisegundos antes de poner el foco en el campo de usuario
 * para que la animación del modal se vea suave
 */
function openAdminModal() {
    // Hacemos visible el modal cambiando su display a 'flex'
    document.getElementById('adminModal').style.display = 'flex';
    
    // Después de 300ms, ponemos el foco en el campo de usuario
    setTimeout(() => {
        document.getElementById('adminUser').focus();
    }, 300);
}

/**
 * Cierra el modal de administrador y limpia los campos
 * Es importante limpiar los campos por seguridad
 */
function closeAdminModal() {
    // Ocultamos el modal
    document.getElementById('adminModal').style.display = 'none';
    // Limpiamos los campos de usuario y contraseña
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
}

/**
 * Maneja el proceso de inicio de sesión del administrador
 * @param {Event} event - El evento del formulario
 */
function loginAdmin(event) {
    // Prevenimos que el formulario recargue la página
    event.preventDefault();
    
    // Obtenemos los valores de usuario y contraseña
    // trim() elimina espacios al inicio y final del texto
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;
    
    // Verificamos si las credenciales son correctas
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Marcamos que el admin está conectado
        isAdminLoggedIn = true;
        
        // Mostramos el panel de administrador con una animación suave
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminPanel').classList.add('fade-in');
        
        // Cerramos el modal y mostramos mensaje de éxito
        closeAdminModal();
        showSuccessMessage('Sesión administrativa iniciada correctamente');
        
        // Si ya tenemos datos cargados, actualizamos las estadísticas
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

/**
 * CÁLCULO DE ESTADÍSTICAS DETALLADAS
 * ---------------------------------
 * Esta sección contiene las funciones para calcular estadísticas avanzadas
 * que se muestran en el panel de administrador
 */

/**
 * Calcula todas las estadísticas detalladas del sistema
 * Incluye mejores promedios, promedios por curso, por asignatura, etc.
 */
function calculateDetailedStats() {
    /**
     * Función auxiliar que limpia y convierte notas a números
     * Por ejemplo:
     * - "8,5" → 8.5
     * - "9.0" → 9.0
     * - "" → null
     */
    function cleanGrade(value) {
        // Si el valor está vacío o no existe, retornamos null
        if (value === undefined || value === null || value === '') return null;
        // Convertimos a texto, quitamos espacios y cambiamos comas por puntos
        let cleanValue = value.toString().trim().replace(',', '.');
        // Convertimos a número
        const numValue = parseFloat(cleanValue);
        // Si es un número válido lo retornamos, si no, retornamos null
        return !isNaN(numValue) ? numValue : null;
    }

    /**
     * Calcula el promedio de todas las notas de un estudiante
     * @param {Array} records - Lista de registros (notas) del estudiante
     * @returns {number|null} - El promedio o null si no hay notas válidas
     */
    function getStudentAverage(records) {
        // Filtramos las asignaturas que no deben contar para el promedio
        const validRecords = records.filter(record => {
            const asignatura = record['ASIGNATURA']?.toUpperCase();
            const subnivel = record['SUBNIVEL'];
            const isQualitative = isQualitativeSubject(asignatura, subnivel);
            
            // Solo incluimos en el promedio las asignaturas que no son cualitativas
            return !isQualitative;
        });

        // Obtenemos todas las notas válidas del estudiante
        const validGrades = validRecords
            .map(r => cleanGrade(r['PROMEDIO']) || cleanGrade(r['PROM']))
            .filter(grade => grade !== null);
            
        // Si no hay notas válidas, retornamos null
        if (validGrades.length === 0) return null;
        
        // Calculamos el promedio: suma de todas las notas dividido por la cantidad
        return validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
    }

    // Agrupar por estudiante
    const studentGroups = {};
    studentData.forEach(record => {
        const id = record['ID_STD'];
        if (!id) return;
        if (!studentGroups[id]) {
            studentGroups[id] = {
                id: id,
                name: record['APELLIDOS Y NOMBRES'],
                curso: record['CURSO'],
                paralelo: record['PARALELO'],
                records: []
            };
        }
        studentGroups[id].records.push(record);
    });

    // Calcular promedios por estudiante
    const studentAverages = Object.values(studentGroups)
        .map(student => ({
            ...student,
            promedio: getStudentAverage(student.records)
        }))
        .filter(student => student.promedio !== null);

    // Mejores y peores estudiantes
    const sortedStudents = [...studentAverages].sort((a, b) => b.promedio - a.promedio);
    const topStudents = sortedStudents.slice(0, 5);
    const bottomStudents = sortedStudents.slice(-5).reverse();

    // Agrupar por curso
    const courseGroups = {};
    studentAverages.forEach(student => {
        const courseKey = `${student.curso} ${student.paralelo}`;
        if (!courseGroups[courseKey]) {
            courseGroups[courseKey] = [];
        }
        courseGroups[courseKey].push(student);
    });

    // Calcular promedios por curso
    const courseAverages = Object.entries(courseGroups)
        .map(([course, students]) => ({
            course,
            average: students.reduce((acc, student) => acc + student.promedio, 0) / students.length,
            studentCount: students.length
        }))
        .sort((a, b) => b.average - a.average);

    // Agrupar por asignatura
    const subjectGroups = {};
    studentData.forEach(record => {
        const subject = record['ASIGNATURA'];
        if (!subject) return;
        if (!subjectGroups[subject]) {
            subjectGroups[subject] = {
                name: subject,
                grades: [],
                teachers: new Set()
            };
        }
        const grade = cleanGrade(record['PROMEDIO']) || cleanGrade(record['PROM']);
        if (grade !== null) {
            subjectGroups[subject].grades.push(grade);
        }
        if (record['DOCENTE']) {
            subjectGroups[subject].teachers.add(record['DOCENTE']);
        }
    });

    // Calcular promedios por asignatura
    const subjectAverages = Object.entries(subjectGroups)
        .map(([subject, data]) => ({
            subject,
            average: data.grades.reduce((acc, grade) => acc + grade, 0) / data.grades.length,
            teachers: Array.from(data.teachers),
            studentCount: data.grades.length
        }))
        .sort((a, b) => b.average - a.average);

    // Lista de docentes
    const teachersList = [...new Set(studentData
        .map(record => record['DOCENTE'])
        .filter(teacher => teacher)
    )].sort();

    return {
        topStudents,
        bottomStudents,
        courseAverages,
        subjectAverages,
        teachersList
    };
}

// Actualizar estadísticas
function updateStatistics() {
    if (studentData.length === 0) return;

    const uniqueStudents = [...new Set(studentData.map(row => row['ID_STD']))].length;
    const totalSubjects = [...new Set(studentData.map(row => row['ASIGNATURA']))].filter(s => s).length;
    
    // Animación de números básicos
    animateCounter('totalRecords', studentData.length);
    animateCounter('uniqueStudents', uniqueStudents);
    animateCounter('totalSubjects', totalSubjects);
    document.getElementById('lastUpdate').textContent = lastUpdateTime.toLocaleTimeString();

    // Calcular y mostrar estadísticas detalladas
    const stats = calculateDetailedStats();
    
    // Actualizar estadísticas detalladas en el DOM
    const detailedStats = document.getElementById('detailedStats');
    if (detailedStats) {
        detailedStats.innerHTML = `
            <div class="stats-section">
                <h4>🏆 Mejores Promedios Generales</h4>
                <div class="stats-list">
                    ${stats.topStudents.map((student, index) => `
                        <div class="stat-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="name">${student.name}</span>
                            <span class="value">${student.promedio.toFixed(2)}</span>
                            <span class="details">${student.curso} ${student.paralelo}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stats-section">
                <h4>⚠️ Promedios Más Bajos</h4>
                <div class="stats-list">
                    ${stats.bottomStudents.map((student, index) => `
                        <div class="stat-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="name">${student.name}</span>
                            <span class="value">${student.promedio.toFixed(2)}</span>
                            <span class="details">${student.curso} ${student.paralelo}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stats-section">
                <h4>📊 Promedios por Curso</h4>
                <div class="stats-list">
                    ${stats.courseAverages.map((course, index) => `
                        <div class="stat-item">
                            <span class="name">${course.course}</span>
                            <span class="value">${course.average.toFixed(2)}</span>
                            <span class="details">${course.studentCount} estudiantes</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stats-section">
                <h4>📚 Promedios por Asignatura</h4>
                <div class="stats-list">
                    ${stats.subjectAverages.map(subject => `
                        <div class="stat-item">
                            <span class="name">${subject.subject}</span>
                            <span class="value">${subject.average.toFixed(2)}</span>
                            <span class="details">${subject.studentCount} estudiantes</span>
                            <span class="teachers">Docentes: ${subject.teachers.join(', ')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stats-section">
                <h4>👨‍🏫 Lista de Docentes</h4>
                <div class="teachers-list">
                    ${stats.teachersList.map(teacher => `
                        <div class="teacher-item">${teacher}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }
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

function nuevaBusqueda() {
    // Limpiar el campo de cédula
    document.getElementById('cedulaInput').value = '';
    
    // Mostrar el botón de búsqueda y ocultar el de nueva búsqueda
    document.getElementById('searchBtn').style.display = 'block';
    document.getElementById('newSearchBtn').style.display = 'none';
    
    // Ocultar la sección de resultados con animación
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.remove('fade-in');
    setTimeout(() => {
        resultsSection.style.display = 'none';
    }, 300);
    
    // Ocultar mensajes
    hideMessages();
    
    // Poner el foco en el campo de cédula
    document.getElementById('cedulaInput').focus();
}

function buscarEstudiante() {
    const cedula = document.getElementById('cedulaInput').value.trim();
    
    if (!cedula) {
        showErrorMessage('Por favor ingrese un número de cédula');
        return;
    }

    if (studentData.length === 0) {
        showErrorMessage('Los datos no están disponibles. Intente nuevamente en unos momentos.');
        loadData();
        return;
    }

    showLoading();
    document.getElementById('loadingText').textContent = 'Buscando estudiante...';
    hideMessages();

    setTimeout(() => {
        try {
            console.log('\n=== INICIANDO BÚSQUEDA ===');
            console.log(`Buscando cédula: "${cedula}"`);
            
            // Búsqueda con coincidencia exacta primero
            let studentRecords = studentData.filter(record => {
                const idStd = record['ID_STD'] ? record['ID_STD'].toString().trim() : '';
                const matches = idStd === cedula;
                if (matches) {
                    console.log(`✓ Coincidencia exacta: ${record['ASIGNATURA']} - ID: "${idStd}"`);
                }
                return matches;
            });
            
            console.log(`Registros encontrados con búsqueda exacta: ${studentRecords.length}`);
            
            // Si no encontramos nada, probar búsqueda flexible
            if (studentRecords.length === 0) {
                console.log('\n--- ESTRATEGIA 2: Búsqueda flexible ---');
                studentRecords = studentData.filter(record => {
                    const idStd = record['ID_STD'] ? record['ID_STD'].toString().trim() : '';
                    const matches = idStd.includes(cedula) || cedula.includes(idStd);
                    if (matches) {
                        console.log(`~ Coincidencia flexible: ${record['ASIGNATURA']} - ID: "${idStd}"`);
                    }
                    return matches;
                });
                console.log(`Registros encontrados con búsqueda flexible: ${studentRecords.length}`);
            }
            
            hideLoading();

            if (studentRecords.length === 0) {
                console.log('\n--- SUGERENCIAS DE CÉDULAS SIMILARES ---');
                const cedulasSimilares = [...new Set(studentData.map(r => r['ID_STD']).filter(id => 
                    id && (id.toString().includes(cedula.substring(0, 3)) || cedula.includes(id.toString().substring(0, 3)))
                ))].slice(0, 10);
                console.log('Cédulas similares encontradas:', cedulasSimilares);
                
                showErrorMessage(`No se encontró ningún estudiante con la cédula: ${cedula}. Revise la consola para ver cédulas similares.`);
                return;
            }

            // Debug: mostrar todos los registros encontrados
            console.log('\n=== REGISTROS ENCONTRADOS ===');
            studentRecords.forEach((record, index) => {
                console.log(`${index + 1}. ${record['ASIGNATURA']} - ${record['DOCENTE']}`);
            });

            // Mostrar información del estudiante
            mostrarInformacionEstudiante(studentRecords[0]);
            
            // Mostrar calificaciones
            mostrarCalificaciones(studentRecords);
            
            // Mostrar sección de resultados con animación
            const resultsSection = document.getElementById('resultsSection');
            resultsSection.style.display = 'block';
            resultsSection.classList.add('fade-in');
            
            // Ocultar botón de búsqueda y mostrar botón de nueva búsqueda
            document.getElementById('searchBtn').style.display = 'none';
            document.getElementById('newSearchBtn').style.display = 'block';
            
            showSuccessMessage(`Estudiante encontrado: ${studentRecords[0]['APELLIDOS Y NOMBRES'] || 'Sin nombre'} (${studentRecords.length} asignaturas)`);

            // Scroll suave hacia los resultados
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
            
            console.log('=== FIN BÚSQUEDA ===\n');

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

    studentRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.1}s`;
        
        const asignatura = record['ASIGNATURA'] || '-';
        const docente = record['DOCENTE'] || '-';
        

        // Función para limpiar y validar notas - CORREGIDA PARA FORMATO DECIMAL CON COMAS
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
            
            // *** CORRECCIÓN: Reemplazar comas por puntos para formato decimal ***
            cleanValue = cleanValue.replace(',', '.');
            
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



        // Función para formatear notas en la tabla - CORREGIDA
        function normalizeText(text) {
            // Función para normalizar texto: quitar tildes y convertir a minúsculas
            return text?.normalize("NFD")
                       .replace(/[\u0300-\u036f]/g, "") // Quita tildes
                       .toLowerCase()
                       .trim();
        }

        function isQualitativeSubject(asignatura, subnivel) {
            // Comprobar si es una asignatura que siempre usa calificación cualitativa
            const qualitativeSubjects = [
                'animacion a la lectura',
                'orientacion vocacional y profesional'
            ];
            
            // Normalizar la asignatura para la comparación
            const normalizedAsignatura = normalizeText(asignatura);
            const normalizedSubnivel = normalizeText(subnivel);
            
            // Verificar si es nivel elemental o si es una asignatura especial en básica superior
            return (
                normalizedSubnivel?.includes('elemental') ||
                (normalizedSubnivel?.includes('superior') && 
                qualitativeSubjects.includes(normalizedAsignatura))
            );
        }

        function formatGrade(nota) {
            if (nota === null || nota === undefined) {
                return '<span class="grade-cell" style="background: #e5e7eb; color: #6b7280; border: 1px solid #d1d5db;">-</span>';
            }

            // Verificar si debe usar calificación cualitativa
            const shouldBeQualitative = isQualitativeSubject(record['ASIGNATURA'], record['SUBNIVEL']);

            let gradeClass = '';
            let displayValue = '';

            if (shouldBeQualitative) {
                // Sistema cualitativo
                if (nota >= 9.5) { gradeClass = 'grade-excellent'; displayValue = 'A+'; }
                else if (nota >= 8.5) { gradeClass = 'grade-excellent'; displayValue = 'A-'; }
                else if (nota >= 7.5) { gradeClass = 'grade-good'; displayValue = 'B+'; }
                else if (nota >= 6.5) { gradeClass = 'grade-good'; displayValue = 'B-'; }
                else if (nota >= 5.5) { gradeClass = 'grade-regular'; displayValue = 'C+'; }
                else if (nota >= 4.5) { gradeClass = 'grade-regular'; displayValue = 'C-'; }
                else if (nota >= 3.5) { gradeClass = 'grade-poor'; displayValue = 'D+'; }
                else if (nota >= 2.5) { gradeClass = 'grade-poor'; displayValue = 'D-'; }
                else if (nota >= 1.5) { gradeClass = 'grade-poor'; displayValue = 'E+'; }
                else if (nota > 0) { gradeClass = 'grade-poor'; displayValue = 'E-'; }
                else { gradeClass = 'grade-poor'; displayValue = 'NE'; }
            } else {
                // Sistema numérico para otros niveles
                if (nota >= 9) gradeClass = 'grade-excellent';
                else if (nota >= 7) gradeClass = 'grade-good';
                else if (nota >= 5) gradeClass = 'grade-regular';
                else gradeClass = 'grade-poor';
                displayValue = nota.toFixed(2).replace(/\.?0+$/, '');
            }
            
            return `<span class="grade-cell ${gradeClass}">${displayValue}</span>`;
        }

        // *** NUEVA LÓGICA: Solo mostrar promedio y estado si hay notas en los 3 trimestres ***
        const tieneTodasLasNotas = trim1 !== null && trim2 !== null && trim3 !== null;
        
        // Función especial para promedio y estado
        function formatPromedioYEstado(valor, esTodoCompleto) {
            if (!esTodoCompleto) {
                return '<span class="grade-cell" style="background: #f3f4f6; color: #9ca3af; border: 1px solid #d1d5db; font-style: italic;">-</span>';
            }
            
            if (valor === null || valor === undefined) {
                return '<span class="grade-cell" style="background: #e5e7eb; color: #6b7280; border: 1px solid #d1d5db;">-</span>';
            }
            
            // Si es texto (como el estado)
            if (isNaN(valor)) {
                return `<strong>${valor}</strong>`;
            }
            
            // Si es número (como el promedio)
            let gradeClass = '';
            if (valor >= 9) gradeClass = 'grade-excellent';
            else if (valor >= 7) gradeClass = 'grade-good';
            else if (valor >= 5) gradeClass = 'grade-regular';
            else gradeClass = 'grade-poor';
            
            return `<span class="grade-cell ${gradeClass}">${valor.toFixed(2).replace(/\.?0+$/, '')}</span>`;
        }

        row.innerHTML = `
            <td><strong>${asignatura}</strong></td>
            <td>${formatGrade(trim1)}</td>
            <td>${formatGrade(trim2)}</td>
            <td>${formatGrade(trim3)}</td>
            <td>${formatPromedioYEstado(promedio, tieneTodasLasNotas)}</td>
            <td>${tieneTodasLasNotas ? `<strong>${estado}</strong>` : '<span style="color: #9ca3af; font-style: italic;">-</span>'}</td>
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
    console.log(`Buscando cédula: "${cedula}"`);
    
    // Primero, ver TODOS los registros sin filtrar para esta cédula
    console.log('\n--- BÚSQUEDA EN DATOS COMPLETOS ---');
    const allMatchingRecords = studentData.filter(record => {
        const idStd = record['ID_STD'] ? record['ID_STD'].toString().trim() : '';
        const matches = idStd === cedula;
        if (matches) {
            console.log(`✓ Encontrado: ${record['ASIGNATURA']} - ID_STD: "${idStd}"`);
        }
        return matches;
    });
    
    console.log(`\nRegistros encontrados para cédula ${cedula}:`, allMatchingRecords.length);
    
    // Mostrar todas las asignaturas encontradas
    const asignaturas = allMatchingRecords.map(r => r['ASIGNATURA']).filter(a => a);
    console.log('Asignaturas encontradas:', asignaturas);
    
    // Buscar también por cédulas similares (en caso de errores de tipeo)
    console.log('\n--- BÚSQUEDA DE CÉDULAS SIMILARES ---');
    const similarCedulas = [...new Set(studentData.map(r => r['ID_STD']).filter(id => 
        id && id.toString().includes(cedula.substring(0, 5))
    ))].slice(0, 10);
    console.log('Cédulas similares encontradas:', similarCedulas);
    
    allMatchingRecords.forEach((record, index) => {
        console.log(`\n--- REGISTRO ${index + 1}: ${record['ASIGNATURA']} ---`);
        Object.keys(record).forEach(key => {
            console.log(`  ${key}: "${record[key]}" (tipo: ${typeof record[key]})`);
        });
    });
    
    console.log('=== FIN DEBUGGING ===');
    return allMatchingRecords;
}

// Función para ver todas las asignaturas disponibles
function debugAllSubjects() {
    console.log('=== TODAS LAS ASIGNATURAS EN EL SISTEMA ===');
    const todasAsignaturas = [...new Set(studentData.map(r => r['ASIGNATURA']).filter(a => a))];
    console.log('Total de asignaturas únicas:', todasAsignaturas.length);
    todasAsignaturas.forEach((asignatura, index) => {
        console.log(`${index + 1}. ${asignatura}`);
    });
    console.log('=== FIN ASIGNATURAS ===');
    return todasAsignaturas;
}

// Función para ver todos los estudiantes
function debugAllStudents() {
    console.log('=== TODOS LOS ESTUDIANTES EN EL SISTEMA ===');
    const todosEstudiantes = [...new Set(studentData.map(r => r['ID_STD']).filter(id => id))];
    console.log('Total de cédulas únicas:', todosEstudiantes.length);
    todosEstudiantes.slice(0, 20).forEach((cedula, index) => {
        const nombre = studentData.find(r => r['ID_STD'] === cedula)['APELLIDOS Y NOMBRES'];
        console.log(`${index + 1}. ${cedula} - ${nombre}`);
    });
    if (todosEstudiantes.length > 20) {
        console.log(`... y ${todosEstudiantes.length - 20} más`);
    }
    console.log('=== FIN ESTUDIANTES ===');
    return todosEstudiantes;
}

// Función para debug completo del filtrado
function debugFiltering() {
    console.log('=== DEBUG DEL PROCESO DE FILTRADO ===');
    console.log('Total de registros cargados:', studentData.length);
    
    // Ver cuántos registros tienen ID_STD válido
    const registrosConID = studentData.filter(row => {
        const hasID = row['ID_STD'] && row['ID_STD'].toString().trim() !== '';
        return hasID;
    });
    console.log('Registros con ID_STD válido:', registrosConID.length);
    
    // Ver registros sin ID_STD válido
    const registrosSinID = studentData.filter(row => {
        const hasID = row['ID_STD'] && row['ID_STD'].toString().trim() !== '';
        return !hasID;
    });
    console.log('Registros SIN ID_STD válido:', registrosSinID.length);
    
    if (registrosSinID.length > 0) {
        console.log('Ejemplos de registros sin ID válido:');
        registrosSinID.slice(0, 5).forEach((registro, index) => {
            console.log(`${index + 1}.`, {
                'ID_STD': registro['ID_STD'],
                'ASIGNATURA': registro['ASIGNATURA'],
                'APELLIDOS Y NOMBRES': registro['APELLIDOS Y NOMBRES']
            });
        });
    }
    
    console.log('=== FIN DEBUG FILTRADO ===');
}

// Funciones helper para probar en consola
window.debugStudentData = debugStudentData;
window.debugAllSubjects = debugAllSubjects;
window.debugAllStudents = debugAllStudents;
window.debugFiltering = debugFiltering;