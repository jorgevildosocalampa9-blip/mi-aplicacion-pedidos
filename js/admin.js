
"use strict";

// ==========================================
// JAGGER MOVE — PANEL ADMINISTRATIVO
// Conexión con Supabase
// ==========================================

const SUPABASE_URL = "https://ckpuoiztfavuuijaedbe.supabase.co";
const SUPABASE_KEY = "sb_publishable_qZxbp2ozqUQ9Kj85vSoTSg_JUGIFlJP";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const $ = id => document.getElementById(id);

// ==========================================
// ELEMENTOS DEL PANEL
// ==========================================

const mensajeAdmin = $("mensajeAdmin");
const btnCerrarSesion = $("btnCerrarSesionAdmin");

// ==========================================
// COMPROBAR SESIÓN
// ==========================================

async function comprobarSesionAdmin() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (!data.session) {
            window.location.replace("index.html");
            return false;
        }

        return true;

    } catch (error) {
        console.error("Error al comprobar sesión:", error);

        mostrarMensaje(
            "No se pudo comprobar tu sesión. Recarga la página.",
            true
        );

        return false;
    }
}

// ==========================================
// MENSAJES
// ==========================================

function mostrarMensaje(mensaje, esError = false) {
    if (!mensajeAdmin) return;

    mensajeAdmin.textContent = mensaje;
    mensajeAdmin.classList.toggle("error", esError);
}

// ==========================================
// TOTAL DE PEDIDOS
// ==========================================

async function cargarTotalPedidos() {
    const { count, error } = await supabaseClient
        .from("pedidos")
        .select("*", {
            count: "exact",
            head: true
        });

    if (error) throw error;

    $("totalPedidos").textContent = count ?? 0;
}

// ==========================================
// TOTAL DE UNIDADES EN STOCK
// ==========================================

async function cargarTotalStock() {
    const { data, error } = await supabaseClient
        .from("inventario_productos")
        .select("stock");

    if (error) throw error;

    const total = (data || []).reduce((suma, producto) => {
        return suma + (Number(producto.stock) || 0);
    }, 0);

    $("totalStock").textContent = total.toLocaleString("es-PE");
}

// ==========================================
// CONTAR PEDIDOS POR ESTADO
// ==========================================

async function cargarEstadosPedidos() {
    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("estado");

    if (error) throw error;

    const estados = {
        "En espera": 0,
        "Preparando": 0,
        "Enviando": 0,
        "Entregado": 0
    };

    (data || []).forEach(pedido => {
        const estado = String(pedido.estado || "").trim();

        if (Object.prototype.hasOwnProperty.call(estados, estado)) {
            estados[estado]++;
        }
    });

    $("pedidosEspera").textContent = estados["En espera"];
    $("pedidosPreparando").textContent = estados["Preparando"];
    $("pedidosEnviando").textContent = estados["Enviando"];
    $("pedidosEntregados").textContent = estados["Entregado"];

    return estados;
}

// ==========================================
// GRÁFICO REAL DE PEDIDOS
// ==========================================

function crearFilaGrafico(nombre, cantidad, porcentaje, color) {
    const fila = document.createElement("div");
    fila.className = "grafico-fila";

    const etiqueta = document.createElement("span");
    etiqueta.className = "grafico-etiqueta";
    etiqueta.textContent = nombre;

    const pista = document.createElement("div");
    pista.className = "grafico-pista";

    const barra = document.createElement("div");
    barra.className = "grafico-barra";
    barra.style.width = porcentaje + "%";
    barra.style.backgroundColor = color;
    barra.setAttribute("aria-label", nombre + ": " + cantidad);

    pista.appendChild(barra);

    const numero = document.createElement("strong");
    numero.className = "grafico-cantidad";
    numero.textContent = cantidad;

    fila.append(etiqueta, pista, numero);

    return fila;
}

function mostrarGraficoPedidos(estados) {
    const contenedor = $("graficoPedidos");

    if (!contenedor) return;

    contenedor.replaceChildren();

    const configuracion = [
        { nombre: "En espera", color: "#858b98" },
        { nombre: "Preparando", color: "#ffad42" },
        { nombre: "Enviando", color: "#55a8ff" },
        { nombre: "Entregado", color: "#42cf91" }
    ];

    const total = Object.values(estados).reduce(
        (suma, cantidad) => suma + cantidad,
        0
    );

    configuracion.forEach(item => {
        const cantidad = estados[item.nombre] || 0;

        const porcentaje = total > 0
            ? (cantidad / total) * 100
            : 0;

        contenedor.appendChild(
            crearFilaGrafico(
                item.nombre,
                cantidad,
                porcentaje,
                item.color
            )
        );
    });

    if (total === 0) {
        const nota = document.createElement("p");
        nota.className = "admin-nota";
        nota.textContent = "Todavía no hay pedidos registrados.";
        contenedor.appendChild(nota);
    }
}

async function cargarGraficoPedidos() {
    const estados = await cargarEstadosPedidos();
    mostrarGraficoPedidos(estados);
}

// ==========================================
// FORMATO DE FECHA
// ==========================================

function formatearFecha(fecha) {
    if (!fecha) return "—";

    // Evitar cambios de día al interpretar fechas YYYY-MM-DD.
    const fechaTexto = String(fecha);
    const soloFecha = fechaTexto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    let fechaObj;

    if (soloFecha) {
        fechaObj = new Date(
            Number(soloFecha[1]),
            Number(soloFecha[2]) - 1,
            Number(soloFecha[3])
        );
    } else {
        fechaObj = new Date(fechaTexto);
    }

    if (Number.isNaN(fechaObj.getTime())) return "—";

    return fechaObj.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

// ==========================================
// TABLA DE ACTIVIDAD RECIENTE
// ==========================================

function crearCelda(texto, clase = "") {
    const celda = document.createElement("td");
    celda.textContent = texto;

    if (clase) {
        celda.className = clase;
    }

    return celda;
}

function claseEstado(estado) {
    const clases = {
        "En espera": "estado-espera",
        "Preparando": "estado-preparando",
        "Enviando": "estado-enviando",
        "Entregado": "estado-entregado"
    };

    return clases[estado] || "";
}

async function cargarPedidosRecientes() {
    const tabla = $("tablaPedidosRecientes");

    if (!tabla) return;

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("id, codigo, nombre, apellido, fecha, estado")
        .order("id", { ascending: false })
        .limit(6);

    if (error) throw error;

    tabla.replaceChildren();

    if (!data || data.length === 0) {
        const fila = document.createElement("tr");
        const celda = crearCelda(
            "Todavía no hay pedidos registrados."
        );

        celda.colSpan = 4;
        celda.className = "tabla-admin-vacia";

        fila.appendChild(celda);
        tabla.appendChild(fila);

        return;
    }

    data.forEach(pedido => {
        const fila = document.createElement("tr");

        const codigo = pedido.codigo || (
            pedido.id != null ? "PED-" + pedido.id : "—"
        );

        const nombreCompleto = [
            pedido.nombre,
            pedido.apellido
        ].filter(Boolean).join(" ") || "Sin nombre";

        const estado = String(pedido.estado || "Sin estado").trim();

        fila.appendChild(
            crearCelda(String(codigo), "tabla-admin-codigo")
        );

        fila.appendChild(
            crearCelda(nombreCompleto)
        );

        fila.appendChild(
            crearCelda(formatearFecha(pedido.fecha))
        );

        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className =
            "estado-etiqueta " + claseEstado(estado);

        etiqueta.textContent = estado;

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        tabla.appendChild(fila);
    });
}

// ==========================================
// CARGAR EL PANEL COMPLETO
// ==========================================

async function cargarPanelAdmin() {
    mostrarMensaje("Conectando con Supabase...");

    const sesionValida = await comprobarSesionAdmin();

    if (!sesionValida) return;

    try {
        await Promise.all([
            cargarTotalPedidos(),
            cargarTotalStock(),
            cargarGraficoPedidos(),
            cargarPedidosRecientes()
        ]);

        mostrarMensaje("Panel actualizado correctamente.");

    } catch (error) {
        console.error("Error al cargar el panel:", error);

        mostrarMensaje(
            "No se pudieron cargar todos los datos. Revisa los permisos de Supabase y los nombres de las columnas.",
            true
        );
    }
}

// ==========================================
// CERRAR SESIÓN
// ==========================================

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", async () => {
        btnCerrarSesion.disabled = true;
        btnCerrarSesion.textContent = "Cerrando sesión...";

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) throw error;

            window.location.replace("index.html");

        } catch (error) {
            console.error("Error al cerrar sesión:", error);

            alert("No se pudo cerrar la sesión. Inténtalo nuevamente.");

            btnCerrarSesion.disabled = false;
            btnCerrarSesion.textContent = "Cerrar sesión";
        }
    });
}

// ==========================================
// INICIAR PANEL
// ==========================================

cargarPanelAdmin();
