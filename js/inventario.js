
const SUPABASE_URL = "https://ckpuoiztfavuuijaedbe.supabase.co";
const SUPABASE_KEY = "sb_publishable_qZxbp2ozqUQ9Kj85vSoTSg_JUGIFlJP";

const inventarioClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let productosInventario = [];

const obtenerElemento = id => document.getElementById(id);

// ===============================
// SESIÓN Y MENÚ
// ===============================

async function iniciarInventario() {
    const { data, error } = await inventarioClient.auth.getSession();

    if (error || !data.session) {
        window.location.href = "index.html";
        return;
    }

    document.body.classList.add("sesion-activa");
    await cargarProductos();
}

obtenerElemento("btnMenu")?.addEventListener("click", () => {
    document.body.classList.toggle("menu-abierto");
});

obtenerElemento("menuFondo")?.addEventListener("click", () => {
    document.body.classList.remove("menu-abierto");
});

obtenerElemento("btnCerrarSesionMenu")?.addEventListener(
    "click", async () => {
        const { error } = await inventarioClient.auth.signOut();

        if (error) {
            alert("No se pudo cerrar sesión: " + error.message);
            return;
        }

        window.location.href = "index.html";
    }
);

// ===============================
// SECCIONES
// ===============================

function mostrarSeccion(id) {
    document.querySelectorAll(".inventario-panel").forEach(panel => {
        panel.hidden = panel.id !== id;
    });

    document.querySelector(".inventario-opciones").hidden = true;
    document.body.classList.add("seccion-abierta");

    if (id === "controlStock") {
        cargarProductos();
    }
}

function volverOpciones() {
    document.querySelectorAll(".inventario-panel").forEach(panel => {
        panel.hidden = true;
    });

    document.querySelector(".inventario-opciones").hidden = false;
    document.body.classList.remove("seccion-abierta");
}

// ===============================
// FORMULARIO Y COSTO TOTAL
// ===============================

const cantidadInput = obtenerElemento("cantidadComprada");
const costoInput = obtenerElemento("costoUnitario");
const precioVentaInput = obtenerElemento("precioVenta");
const costoPreview = obtenerElemento("costoTotalPreview");
const formularioProducto = obtenerElemento("formularioProducto");

function fechaLocalISO() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function actualizarCostoTotal() {
    const cantidad = Number(cantidadInput.value) || 0;
    const costo = Number(costoInput.value) || 0;

    costoPreview.textContent = "S/ " + (cantidad * costo).toFixed(2);
}

cantidadInput.addEventListener("input", actualizarCostoTotal);
costoInput.addEventListener("input", actualizarCostoTotal);

obtenerElemento("fechaCompra").value = fechaLocalISO();

formularioProducto.addEventListener("submit", async event => {
    event.preventDefault();

    const nombre = obtenerElemento("nombreProducto").value.trim();
    const codigo = obtenerElemento("codigoProducto").value.trim();
    const stock = Number(cantidadInput.value);
    const costo = Number(costoInput.value);
    const precioVenta = Number(precioVentaInput.value);
    const fecha = obtenerElemento("fechaCompra").value;

    if (
        !nombre || !codigo || !fecha ||
        !Number.isInteger(stock) || stock < 1 ||
        !Number.isFinite(costo) || costo < 0 ||
        !Number.isFinite(precioVenta) || precioVenta <= 0
    ) {
        alert("Revisa los datos del producto.");
        return;
    }

    const boton = formularioProducto.querySelector(
        'button[type="submit"]'
    );

    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {
        const { error } = await inventarioClient
        .from("inventario_productos")
        .insert([{
        nombre,
        codigo,
        stock,
        costo_unitario: costo,
        precio_venta: precioVenta,
        fecha_compra: fecha
    }]);

        if (error) {
            console.error("Error al guardar:", error);

            alert(
                error.code === "23505"
                    ? "Ya existe un producto con ese código."
                    : "No se pudo guardar: " + error.message
            );
            return;
        }

        alert("Producto registrado correctamente.");

        formularioProducto.reset();
        obtenerElemento("fechaCompra").value = fechaLocalISO();
        actualizarCostoTotal();

        await cargarProductos();
    } finally {
        boton.disabled = false;
        boton.textContent = "Registrar producto";
    }
});

// ===============================
// CARGAR PRODUCTOS
// ===============================

async function cargarProductos() {
    const lista = obtenerElemento("listaStock");

    lista.replaceChildren();

    const filaCarga = document.createElement("tr");
    const celdaCarga = document.createElement("td");
    celdaCarga.colSpan = 8;
    celdaCarga.textContent = "Cargando productos...";
    filaCarga.appendChild(celdaCarga);
    lista.appendChild(filaCarga);

    const { data, error } = await inventarioClient
        .from("inventario_productos")
        .select("id, nombre, codigo, stock, costo_unitario, precio_venta, fecha_compra")
        .order("nombre", { ascending: true });

    if (error) {
        console.error("Error al cargar inventario:", error);
        lista.replaceChildren();

        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 8;
        celda.textContent = "Error al cargar: " + error.message;
        fila.appendChild(celda);
        lista.appendChild(fila);
        return;
    }

   productosInventario = data || [];
mostrarProductos();
await calcularTotalVendido();
}

// ===============================
// MOSTRAR TABLA Y RESUMEN
// ===============================

function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";

    const partes = String(fecha).split("-");
    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function mostrarProductos() {
    const lista = obtenerElemento("listaStock");
    const busqueda = obtenerElemento("buscarProducto")
        .value.trim().toLowerCase();

    lista.replaceChildren();

    const filtrados = productosInventario.filter(producto =>
        String(producto.nombre).toLowerCase().includes(busqueda) ||
        String(producto.codigo).toLowerCase().includes(busqueda)
    );

    const totalUnidades = productosInventario.reduce(
        (total, producto) => total + Number(producto.stock || 0), 0
    );

    const valorTotal = productosInventario.reduce(
        (total, producto) =>
            total + Number(producto.stock || 0) *
                Number(producto.costo_unitario || 0), 0
    );

    if (obtenerElemento("totalProductos")) {
    obtenerElemento("totalProductos").textContent =
        productosInventario.length;
}

if (obtenerElemento("totalUnidades")) {
    obtenerElemento("totalUnidades").textContent =
        totalUnidades;
}

if (obtenerElemento("valorStock")) {
    obtenerElemento("valorStock").textContent =
        "S/ " + valorTotal.toFixed(2);
}

    if (filtrados.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 7;
        celda.textContent = productosInventario.length
            ? "No se encontraron productos."
            : "Todavía no hay productos registrados.";

        fila.appendChild(celda);
        lista.appendChild(fila);
        return;
    }

    filtrados.forEach(producto => {
        const fila = document.createElement("tr");

        const valores = [
            producto.codigo,
            producto.nombre,
            producto.stock,
             "S/ " + Number(producto.costo_unitario).toFixed(2),
             "S/ " + Number(producto.precio_venta || 0).toFixed(2),
             "S/ " + (
             Number(producto.stock) *
             Number(producto.costo_unitario)
             ).toFixed(2),
             formatearFecha(producto.fecha_compra)
        ]


        valores.forEach((valor, indice) => {
            const celda = document.createElement("td");
            celda.textContent = valor;

            if (indice === 0) celda.classList.add("inv-codigo");
            if (indice === 2) celda.classList.add("inv-stock");

            fila.appendChild(celda);
        });

        const celdaAcciones = document.createElement("td");
        const botonEliminar = document.createElement("button");

        botonEliminar.type = "button";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.className = "btn-eliminar-stock";

        botonEliminar.addEventListener("click", () => {
            eliminarProducto(producto.id, producto.nombre, botonEliminar);
        });

        celdaAcciones.appendChild(botonEliminar);
        fila.appendChild(celdaAcciones);
        lista.appendChild(fila);
    });
}

obtenerElemento("buscarProducto").addEventListener(
    "input", mostrarProductos
);

// ===============================
// ELIMINAR PRODUCTO
// ===============================

async function eliminarProducto(id, nombre, boton) {
    const confirmar = confirm(
        `¿Seguro que deseas eliminar "${nombre}" del inventario? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    boton.disabled = true;
    boton.textContent = "Eliminando...";

    const { data, error } = await inventarioClient
        .from("inventario_productos")
        .delete()
        .eq("id", id)
        .select("id");

    if (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar: " + error.message);
        boton.disabled = false;
        boton.textContent = "Eliminar";
        return;
    }

    if (!data || data.length === 0) {
        alert(
            "No se eliminó ningún registro. Revisa los permisos de eliminación de Supabase."
        );
        boton.disabled = false;
        boton.textContent = "Eliminar";
        return;
    }

    productosInventario = productosInventario.filter(
        producto => producto.id !== id
    );

    mostrarProductos();
}

// ===============================
// INICIAR
// ===============================

iniciarInventario();

function exportarInventarioExcel() {
    if (productosInventario.length === 0) {
        alert("No hay productos para exportar.");
        return;
    }

    const encabezados = [
        "Código",
        "Producto",
        "Stock",
        "Costo unitario (S/)",
        "Valor total (S/)",
        "Fecha de compra"
    ];

    const filas = productosInventario.map(producto => [
        producto.codigo,
        producto.nombre,
        producto.stock,
        Number(producto.costo_unitario).toFixed(2),
        (
            Number(producto.stock) *
            Number(producto.costo_unitario)
        ).toFixed(2),
        producto.fecha_compra || ""
    ]);

    // Formato compatible con Excel
    const escapar = valor =>
        '"' + String(valor ?? "").replace(/"/g, '""') + '"';

    const contenido = "\uFEFF" +
        [encabezados, ...filas]
            .map(fila => fila.map(escapar).join(";"))
            .join("\r\n");

    const archivo = new Blob(
        [contenido],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "inventario_" +
        new Date().toISOString().slice(0, 10) + ".csv";

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}


async function calcularTotalVendido() {
    const elemento = document.getElementById("totalVendido");

    if (!elemento) return;

    elemento.textContent = "Calculando...";

    // Obtener los pedidos entregados
    const { data: pedidos, error: errorPedidos } =
        await inventarioClient
            .from("pedidos")
            .select("producto_id, cantidad, estado")
            .eq("estado", "Entregado");

    if (errorPedidos) {
        console.error("Error leyendo pedidos:", errorPedidos);
        elemento.textContent = "Error de lectura";
        return;
    }

    // Obtener los precios de venta del inventario
    const { data: productos, error: errorProductos } =
        await inventarioClient
            .from("inventario_productos")
            .select("id, precio_venta");

    if (errorProductos) {
        console.error("Error leyendo precios:", errorProductos);
        elemento.textContent = "Error de precios";
        return;
    }

    console.log("Pedidos entregados:", pedidos);
    console.log("Productos y precios:", productos);

    const precios = new Map(
        (productos || []).map(producto => [
            Number(producto.id),
            Number(producto.precio_venta || 0)
        ])
    );

    const total = (pedidos || []).reduce((suma, pedido) => {
        const precio = precios.get(Number(pedido.producto_id)) || 0;
        const cantidad = Number(pedido.cantidad) || 0;

        return suma + precio * cantidad;
    }, 0);

    elemento.textContent = "S/ " + total.toFixed(2);

    console.log("Total vendido calculado:", total);
}