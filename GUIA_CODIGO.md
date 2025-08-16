/**
 * GUÍA DE REFERENCIA DEL CÓDIGO
 * ============================
 * 
 * Este documento explica las diferentes partes del código en script.js
 * y cómo funcionan juntas.
 */

/**
 * 1. CONFIGURACIÓN INICIAL
 * -----------------------
 * Al inicio del archivo tenemos las variables principales:
 * 
 * const GOOGLE_SHEET_URL = '...';
 * - Esta es la URL de donde obtenemos los datos
 * - Está configurada como CSV para que sea fácil de procesar
 * 
 * let studentData = [];
 * - Array que guarda todos los datos de los estudiantes
 * - Se llena cuando cargamos datos de Google Sheets
 * 
 * let lastUpdateTime = null;
 * - Guarda la hora de la última actualización de datos
 * 
 * let isAdminLoggedIn = false;
 * - Controla si el administrador ha iniciado sesión
 * 
 * 2. CARGA DE DATOS
 * ----------------
 * La función loadData() es asíncrona y hace lo siguiente:
 * 1. Muestra un indicador de carga
 * 2. Hace una petición a Google Sheets
 * 3. Convierte los datos CSV a un formato que JavaScript puede usar
 * 4. Guarda los datos en studentData
 * 5. Actualiza las estadísticas si el admin está conectado
 * 
 * 3. BÚSQUEDA DE ESTUDIANTES
 * ------------------------
 * La función buscarEstudiante():
 * 1. Obtiene la cédula ingresada
 * 2. Busca en los datos usando diferentes estrategias:
 *    - Primero busca coincidencia exacta
 *    - Si no encuentra, busca coincidencia parcial
 * 3. Muestra los resultados o un mensaje de error
 * 
 * 4. SISTEMA DE CALIFICACIONES
 * --------------------------
 * Para mostrar las notas usamos dos sistemas:
 * 
 * Nivel Elemental (cualitativo):
 * - A+ (≥ 9.5)  - Excelente
 * - A- (≥ 8.5)
 * - B+ (≥ 7.5)  - Muy Bueno
 * - B- (≥ 6.5)
 * - C+ (≥ 5.5)  - Bueno
 * - C- (≥ 4.5)
 * - D+ (≥ 3.5)  - Regular
 * - D- (≥ 2.5)
 * - E+ (≥ 1.5)  - Insuficiente
 * - E- (> 0)
 * - NE (= 0)    - No Evaluado
 * 
 * Otros Niveles (numérico):
 * - Excelente (≥ 9)
 * - Muy Bueno (≥ 7)
 * - Regular (≥ 5)
 * - Necesita Mejorar (< 5)
 * 
 * 5. ESTADÍSTICAS DETALLADAS
 * -------------------------
 * El sistema calcula varias estadísticas:
 * 
 * 1. Mejores Promedios:
 *    - Top 5 estudiantes con mejores notas
 *    - Incluye nombre, promedio y curso
 * 
 * 2. Promedios más Bajos:
 *    - 5 estudiantes que necesitan más apoyo
 *    - Ayuda a identificar casos que requieren atención
 * 
 * 3. Promedios por Curso:
 *    - Rendimiento promedio de cada curso
 *    - Número de estudiantes por curso
 * 
 * 4. Promedios por Asignatura:
 *    - Rendimiento en cada materia
 *    - Lista de docentes por asignatura
 * 
 * 6. FUNCIONES DE UTILIDAD
 * ----------------------
 * - showLoading(): Muestra indicador de carga
 * - hideLoading(): Oculta indicador de carga
 * - showErrorMessage(): Muestra mensajes de error
 * - showSuccessMessage(): Muestra mensajes de éxito
 * - cleanGrade(): Limpia y valida notas numéricas
 * - formatGrade(): Da formato a las notas según el nivel
 * 
 * 7. ACTUALIZACIÓN AUTOMÁTICA
 * -------------------------
 * El sistema actualiza los datos:
 * - Al cargar la página
 * - Cuando el admin hace clic en "Actualizar"
 * - Cada 10 minutos si el admin está conectado
 */
