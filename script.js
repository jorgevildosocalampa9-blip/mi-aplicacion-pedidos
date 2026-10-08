const SUPABASE_URL = "https://ckpuoiztfavuuijaedbe.supabase.co";
const SUPABASE_KEY = "sb_publishable_qZxbp2ozqUQ9Kj85vSoTSg_JUGIFlJP";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase conectado");


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

        // Ya existe una sesión
        loginOverlay.style.display = "none";

    } else {

        // No existe sesión
        loginOverlay.style.display = "flex";

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

    console.log("Usuario conectado:", data.user);

});


// ===============================
// REGISTRAR PEDIDO
// ===============================

const formulario = document.getElementById("formularioPedido");

formulario.addEventListener("submit", async function(event) {

    event.preventDefault();

    const nombre =
        document.getElementById("nombre").value;

    const apellido =
        document.getElementById("apellido").value;

    const numero =
        document.getElementById("numero").value;

    const provincia =
        document.getElementById("provincia").value;

    const pedido =
        document.getElementById("pedido").value;

    const cantidad =
        document.getElementById("cantidad").value;


    // Crear pedido
    const nuevoPedido = {

        codigo: "PED-" + Date.now(),

        nombre: nombre,

        apellido: apellido,

        numero: numero,

        provincia: provincia,

        pedido: pedido,

        cantidad: cantidad,

        fecha: new Date().toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }),

        estado: "En espera"

    };


    // ===============================
    // GUARDAR EN SUPABASE
    // ===============================

    const { data, error } = await supabaseClient
        .from("pedidos")
        .insert([nuevoPedido]);


    if (error) {

        console.error("ERROR SUPABASE:", error);

        alert(error.message);

        return;
    }


    alert("Pedido guardado correctamente.");

    console.log("Pedido guardado:", nuevoPedido);

    formulario.reset();

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

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

});
