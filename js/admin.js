"use strict";

// ======================================
// CONEXIÓN CON SUPABASE
// ======================================

const SUPABASE_URL = "https://ckpuoiztfavuuijaedbe.supabase.co";
const SUPABASE_KEY = "sb_publishable_qZxbp2ozqUQ9Kj85vSoTSg_JUGIFlJP";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const $ = id => document.getElementById(id);

// ======================================
// ELEMENTOS DEL PANEL
// ======================================

const mensajeAdmin = $("mensajeAdmin");
const btnCerrarSesion = $("btnCerrarSesionAdmin");

// ======================================
// VERIFICAR SESIÓN
// ======================================

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

// ======================================
// MENSAJES
// ======================================

function mostrarMensaje(mensaje, esError = false) {
    if (!mensajeAdmin) return;

    mensajeAdmin.textContent = mensaje;
    mensajeAdmin.classList.toggle("error", esError);
}

// ======================================
// CARGAR TOTAL DE PEDIDOS
// ======================================

async function cargarTotalPedidos() {
    const { count, error } = await supabaseClient
        .from("pedidos")
        .select("*", { count: "exact", head: true });

    if (error) throw error;

    $("totalPedidos").textContent = count ?? 0;
}

// ======================================
// CARGAR STOCK
// ======================================

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

// ======================================
// CARGAR PEDIDOS POR ESTADO
// ======================================

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
}

// ======================================
// ACTUALIZAR TODO EL PANEL
// ======================================

async function cargarPanelAdmin() {
    mostrarMensaje("Cargando información...");

    const sesionValida = await comprobarSesionAdmin();

    if (!sesionValida) return;

    try {
        await Promise.all([
            cargarTotalPedidos(),
            cargarTotalStock(),
            cargarEstadosPedidos()
        ]);

        mostrarMensaje("Información actualizada correctamente.");

    } catch (error) {
        console.error("Error al cargar el panel:", error);

        mostrarMensaje(
            "No se pudieron cargar todos los datos. Revisa la conexión y los permisos de Supabase.",
            true
        );
    }
}

// ======================================
// CERRAR SESIÓN
// ======================================

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

// ======================================
// INICIAR PANEL
// ======================================

cargarPanelAdmin();
