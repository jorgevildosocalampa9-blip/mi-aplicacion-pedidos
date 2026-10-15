
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

console.log("Supabase conectado");

const $ = id => document.getElementById(id);

// ======================================
// ELEMENTOS DE LA PÁGINA
// ======================================

const formulario = $("formularioPedido");
const selectorProducto = $("pedido");
const selectorDestino = $("destino");

const loginOverlay = $("loginOverlay");
const btnLogin = $("btnLogin");
const loginError = $("loginError");

const btnCerrarSesion = $("btnCerrarSesion");
const btnCerrarSesionMenu = $("btnCerrarSesionMenu");

let sesionActiva = false;

// ======================================
// COMPROBAR SESIÓN
// ======================================

async function comprobarSesion() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Error al comprobar la sesión:", error);
    }

    sesionActiva = Boolean(data?.session);

    if (loginOverlay) {
        loginOverlay.style.display = sesionActiva ? "none" : "flex";
    }

    document.body.classList.toggle("sesion-activa", sesionActiva);

    if (sesionActiva) {
        await cargarProductosPedido();
    }
}

supabaseClient.auth.onAuthStateChange((evento, session) => {
    sesionActiva = Boolean(session);

    if (loginOverlay) {
        loginOverlay.style.display = sesionActiva ? "none" : "flex";
    }

    document.body.classList.toggle("sesion-activa", sesionActiva);
});

comprobarSesion();

// ======================================
// INICIAR SESIÓN
// ======================================

if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
        const email = $("email")?.value.trim() || "";
        const password = $("password")?.value || "";

        if (!email || !password) {
            if (loginError) {
                loginError.textContent = "Escribe tu correo y contraseña.";
            }
            return;
        }

        if (loginError) loginError.textContent = "";

        btnLogin.disabled = true;
        btnLogin.textContent = "Ingresando...";

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            sesionActiva = true;

            console.log("Usuario conectado:", data.user);

            // Abrir el panel administrativo después de iniciar sesión
            window.location.replace("admin.html");
            return;
        } catch (error) {
            console.error("Error de inicio de sesión:", error);

            if (loginError) {
                loginError.textContent = "Correo o contraseña incorrectos.";
            }
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = "Ingresar";
        }
    });
}

// ======================================
// CARGAR PRODUCTOS DEL INVENTARIO
// ======================================

async function cargarProductosPedido() {
    if (!selectorProducto) return;

    selectorProducto.replaceChildren();

    const opcionCarga = document.createElement("option");
    opcionCarga.value = "";
    opcionCarga.textContent = "Cargando productos...";
    selectorProducto.appendChild(opcionCarga);

    try {
        const { data: productos, error } = await supabaseClient
            .from("inventario_productos")
            .select("id, nombre, codigo, stock")
            .order("nombre", { ascending: true });

        if (error) throw error;

        selectorProducto.replaceChildren();

        const opcionInicial = document.createElement("option");
        opcionInicial.value = "";
        opcionInicial.textContent = "Selecciona un producto";
        selectorProducto.appendChild(opcionInicial);

        (productos || []).forEach(producto => {
            const opcion = document.createElement("option");

            opcion.value = producto.id;
            opcion.textContent =
                `${producto.nombre} — ${producto.codigo} — Stock: ${producto.stock}`;

            opcion.dataset.stock = producto.stock;
            opcion.dataset.nombre = producto.nombre;
            opcion.dataset.codigo = producto.codigo;

            if (Number(producto.stock) <= 0) {
                opcion.disabled = true;
                opcion.textContent += " (Agotado)";
            }

            selectorProducto.appendChild(opcion);
        });

        if (!productos || productos.length === 0) {
            opcionInicial.textContent = "No hay productos en el inventario";
        }
    } catch (error) {
        console.error("Error al cargar productos:", error);

        selectorProducto.replaceChildren();

        const opcionError = document.createElement("option");
        opcionError.value = "";
        opcionError.textContent = "No se pudieron cargar los productos";
        selectorProducto.appendChild(opcionError);
    }
}

// ======================================
// REGISTRAR PEDIDO
// ======================================

if (formulario) {
    formulario.addEventListener("submit", async event => {
        event.preventDefault();

        if (!sesionActiva) {
            alert("Inicia sesión antes de registrar un pedido.");
            if (loginOverlay) loginOverlay.style.display = "flex";
            return;
        }

        // Comprobar que existen los campos necesarios
        if (!selectorProducto || !selectorDestino) {
            console.error(
                "Falta el elemento HTML pedido o destino. Revisa sus respectivos ID."
            );
            alert("Falta un campo del formulario. Revisa el HTML.");
            return;
        }

        const nombre = $("nombre")?.value.trim() || "";
        const apellido = $("apellido")?.value.trim() || "";
        const numero = $("numero")?.value.trim() || "";
        const provincia = $("provincia")?.value.trim() || "";
        const destino = selectorDestino.value;
        const productoId = selectorProducto.value;
        const cantidadNumero = Number($("cantidad")?.value);

        if (!nombre || !apellido || !numero || !provincia) {
            alert("Completa todos los datos del cliente.");
            return;
        }

        if (!destino) {
            alert("Selecciona si el envío es Lima o Provincia.");
            selectorDestino.focus();
            return;
        }

        if (!productoId) {
            alert("Selecciona un producto del inventario.");
            selectorProducto.focus();
            return;
        }

        if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) {
            alert("La cantidad debe ser un número entero mayor que cero.");
            $("cantidad")?.focus();
            return;
        }

        const botonRegistrar = formulario.querySelector(
            'input[type="submit"]'
        );

        if (botonRegistrar) {
            botonRegistrar.disabled = true;
            botonRegistrar.value = "Guardando...";
        }

        try {
            // Consultar producto y stock actual
            const { data: producto, error: errorProducto } =
                await supabaseClient
                    .from("inventario_productos")
                    .select("id, nombre, codigo, stock")
                    .eq("id", productoId)
                    .single();

            if (errorProducto || !producto) {
                throw new Error(
                    "No se pudo consultar el producto. " +
                    (errorProducto?.message || "")
                );
            }

            if (Number(producto.stock) < cantidadNumero) {
                alert(
                    `Stock insuficiente de ${producto.nombre}. ` +
                    `Disponible: ${producto.stock} unidades.`
                );

                await cargarProductosPedido();
                return;
            }

            const nuevoPedido = {
                codigo: "PED-" + Date.now(),
                nombre,
                apellido,
                numero,
                provincia,
                destino,
                pedido: producto.nombre,
                producto_id: producto.id,
                cantidad: String(cantidadNumero),
                fecha: new Date().toLocaleString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                estado: "En espera"
            };

            // Guardar el pedido en Supabase
            const { data, error } = await supabaseClient
                .from("pedidos")
                .insert([nuevoPedido])
                .select();

            if (error) throw error;

            console.log("Pedido registrado:", data);

            alert(
                "Pedido guardado correctamente.\n" +
                "Código: " + nuevoPedido.codigo
            );

            formulario.reset();

            await cargarProductosPedido();
        } catch (error) {
            console.error("Error al guardar el pedido:", error);

            alert(
                "No se pudo guardar el pedido.\n" +
                "Detalle: " + error.message
            );
        } finally {
            if (botonRegistrar) {
                botonRegistrar.disabled = false;
                botonRegistrar.value = "Registrar";
            }
        }
    });
}

// ======================================
// RECUPERAR CONTRASEÑA
// ======================================

const btnOlvidePassword = $("btnOlvidePassword");
const recuperacionMensaje = $("recuperacionMensaje");

if (btnOlvidePassword) {
    btnOlvidePassword.addEventListener("click", async event => {
        event.preventDefault();

        const email = $("email")?.value.trim() || "";

        if (!email) {
            if (recuperacionMensaje) {
                recuperacionMensaje.textContent =
                    "Escribe tu correo primero.";
            }
            return;
        }

        if (recuperacionMensaje) {
            recuperacionMensaje.textContent = "Enviando correo...";
        }

        try {
            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo:
                        "http://127.0.0.1:5500/aplicacion%20j/reset-password.html"
                });

            if (error) throw error;

            if (recuperacionMensaje) {
                recuperacionMensaje.textContent =
                    "Revisa tu correo para restablecer tu contraseña.";
            }
        } catch (error) {
            console.error("Error al recuperar contraseña:", error);

            if (recuperacionMensaje) {
                recuperacionMensaje.textContent =
                    "No se pudo enviar el correo. Inténtalo más tarde.";
            }
        }
    });
}

// ======================================
// CERRAR SESIÓN
// ======================================

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", cerrarSesion);
}

if (btnCerrarSesionMenu) {
    btnCerrarSesionMenu.addEventListener("click", cerrarSesion);
}

async function cerrarSesion() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Error al cerrar sesión:", error);
        alert("No se pudo cerrar la sesión. Inténtalo nuevamente.");
        return;
    }

    sesionActiva = false;

    if (loginOverlay) loginOverlay.style.display = "flex";

    document.body.classList.remove("sesion-activa");

    if ($("email")) $("email").value = "";
    if ($("password")) $("password").value = "";

    document.body.classList.remove("menu-abierto");
}

// ======================================
// MENÚ LATERAL
// ======================================

const btnMenu = $("btnMenu");
const menuFondo = $("menuFondo");

if (btnMenu && menuFondo) {
    btnMenu.addEventListener("click", () => {
        document.body.classList.toggle("menu-abierto");
    });

    menuFondo.addEventListener("click", () => {
        document.body.classList.remove("menu-abierto");
    });
}