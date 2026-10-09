const SUPABASE_URL = "https://ckpuoiztfavuuijaedbe.supabase.co";
const SUPABASE_KEY = "sb_publishable_qZxbp2ozqUQ9Kj85vSoTSg_JUGIFlJP";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase conectado");

// ===============================
// CARGAR PRODUCTOS EN LA LISTA
// ===============================

const selectorProducto = document.getElementById("pedido");

async function cargarProductosPedido() {
    if (!selectorProducto) return;

    selectorProducto.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Cargando productos...";
    selectorProducto.appendChild(opcionInicial);

    const { data: productos, error } = await supabaseClient
        .from("inventario_productos")
        .select("id, nombre, codigo, stock")
        .order("nombre", { ascending: true });

    selectorProducto.replaceChildren();

    if (error) {
        console.error("Error al cargar productos:", error);

        const opcionError = document.createElement("option");
        opcionError.value = "";
        opcionError.textContent = "No se pudieron cargar los productos";
        selectorProducto.appendChild(opcionError);

        return;
    }

    const opcionInicialLista = document.createElement("option");
    opcionInicialLista.value = "";
    opcionInicialLista.textContent = "Selecciona un producto";
    selectorProducto.appendChild(opcionInicialLista);

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
}

cargarProductosPedido();


// ===============================
// ELEMENTOS DEL LOGIN
// ===============================

const loginOverlay = document.getElementById("loginOverlay");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");


// ===============================
// COMPROBAR SESIÓN
// ===============================

supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
        loginOverlay.style.display = "none";
        document.body.classList.add("sesion-activa");
    } else {
        loginOverlay.style.display = "flex";
        document.body.classList.remove("sesion-activa");
    }
});


// ===============================
// INICIAR SESIÓN
// ===============================

btnLogin.addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginError.textContent = "";

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {

        console.error("ERROR LOGIN:", error);

        loginError.textContent =
            "Correo o contraseña incorrectos";

        return;
    }

    // Login correcto
    loginOverlay.style.display = "none";
    document.body.classList.add("sesion-activa");

    console.log("Usuario conectado:", data.user);

});


// ===============================
// REGISTRAR PEDIDO
// ===============================

const formulario = document.getElementById("formularioPedido");

formulario.addEventListener("submit", async function(event) {
    event.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const numero = document.getElementById("numero").value.trim();
    const provincia = document.getElementById("provincia").value.trim();

    const productoId = selectorProducto.value;
    const cantidadNumero = Number(
        document.getElementById("cantidad").value
    );

    if (!productoId) {
        alert("Selecciona un producto del inventario.");
        return;
    }

    if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) {
        alert("La cantidad debe ser un número entero mayor que cero.");
        return;
    }

    // Consultar el stock actual en Supabase
    const { data: producto, error: errorProducto } = await supabaseClient
        .from("inventario_productos")
        .select("id, nombre, codigo, stock")
        .eq("id", productoId)
        .single();

    if (errorProducto || !producto) {
        alert("No se pudo consultar el producto. Inténtalo nuevamente.");
        console.error("Error al consultar producto:", errorProducto);
        return;
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

    const botonRegistrar = formulario.querySelector(
        'input[type="submit"]'
    );

    botonRegistrar.disabled = true;
    botonRegistrar.value = "Guardando...";

    try {
        const { error } = await supabaseClient
            .from("pedidos")
            .insert([nuevoPedido]);

        if (error) {
            console.error("Error al guardar pedido:", error);
            alert("No se pudo guardar el pedido: " + error.message);
            return;
        }

        alert("Pedido guardado correctamente.");

        formulario.reset();
        await cargarProductosPedido();

    } finally {
        botonRegistrar.disabled = false;
        botonRegistrar.value = "Registrar";
    }
});


// ===============================
// RECUPERAR CONTRASEÑA
// ===============================

const btnOlvidePassword =
    document.getElementById("btnOlvidePassword");

const recuperacionMensaje =
    document.getElementById("recuperacionMensaje");


btnOlvidePassword.addEventListener("click", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("email").value.trim();


    if (!email) {

        recuperacionMensaje.textContent =
            "Escribe tu correo primero.";

        return;
    }


    recuperacionMensaje.textContent =
        "Enviando correo...";


    const { error } =
        await supabaseClient.auth.resetPasswordForEmail(
            email,
            {
                redirectTo:
                    "http://127.0.0.1:5500/aplicacion%20j/reset-password.html"
            }
        );


    if (error) {

        console.error(error);

        recuperacionMensaje.textContent =
            "No se pudo enviar el correo.";

        return;
    }


    recuperacionMensaje.textContent =
        "Revisa tu correo para restablecer tu contraseña.";

});

const btnCerrarSesion = document.getElementById("btnCerrarSesion");

btnCerrarSesion.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("ERROR AL CERRAR SESIÓN:", error);
        return;
    }

    loginOverlay.style.display = "flex";
    document.body.classList.remove("sesion-activa");

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

});

// ===============================
// FUNCIONAMIENTO DEL MENÚ LATERAL
// ===============================

const btnMenu = document.getElementById("btnMenu");
const menuFondo = document.getElementById("menuFondo");
const btnCerrarSesionMenu =
    document.getElementById("btnCerrarSesionMenu");

if (btnMenu && menuFondo) {
    btnMenu.addEventListener("click", () => {
        document.body.classList.toggle("menu-abierto");
    });

    menuFondo.addEventListener("click", () => {
        document.body.classList.remove("menu-abierto");
    });
}

// Cerrar sesión usando la función que ya existe
if (btnCerrarSesionMenu && btnCerrarSesion) {
    btnCerrarSesionMenu.addEventListener("click", () => {
        btnCerrarSesion.click();
    });
}
