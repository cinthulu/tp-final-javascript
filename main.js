// Proyecto Final - Tienda Online

// -----------------------------
// Constantes y utilidades
// -----------------------------

const PORCENTAJE_IVA = 21; // IVA del 21%
const CLAVE_STORAGE_PRODUCTOS = "productos_tienda";
const CLAVE_SESSION_CARRITO = "carrito_tienda";

/**
 * Formatea un número a moneda argentina.
 */
function formatearMoneda(numero) {
  const formato = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
  return formato.format(numero);
}

/**
 * Muestra una alerta SweetAlert2
 */
function mostrarAlertaExito(mensaje) {
  Swal.fire({
    icon: "success",
    title: "Éxito",
    text: mensaje,
    confirmButtonText: "Aceptar",
  });
}

function mostrarAlertaError(mensaje) {
  Swal.fire({
    icon: "error",
    title: "Error",
    text: mensaje,
    confirmButtonText: "Aceptar",
  });
}

function mostrarConfirmacion(titulo, texto, callbackConfirmado) {
  Swal.fire({
    title: titulo,
    text: texto,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Sí",
    cancelButtonText: "Cancelar",
  }).then((resultado) => {
    if (resultado.isConfirmed && typeof callbackConfirmado === "function") {
      callbackConfirmado();
    }
  });
}

// -----------------------------
// Clases y modelos
// -----------------------------

class Producto {

  constructor(id, nombre, descripcion, precio, descuentoPorcentaje = 0, imagenUrl = "") {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.descuentoPorcentaje = descuentoPorcentaje;
    this.imagenUrl = imagenUrl;
  }

  /** Precio con descuento aplicado (sin IVA) */
  obtenerPrecioConDescuento() {
    const tieneDescuento = this.descuentoPorcentaje > 0;
    if (!tieneDescuento) return this.precio;
    const descuento = (this.precio * this.descuentoPorcentaje) / 100;
    return Math.max(0, this.precio - descuento);
  }

  /** IVA correspondiente al precio con descuento */
  obtenerIva() {
    const base = this.obtenerPrecioConDescuento();
    return (base * PORCENTAJE_IVA) / 100;
  }

  /** Precio final unitario: base con descuento + IVA */
  obtenerPrecioFinalUnitario() {
    return this.obtenerPrecioConDescuento() + this.obtenerIva();
  }
}

class ItemCarrito {
  constructor(producto, cantidad = 1) {
    this.producto = producto;
    this.cantidad = cantidad;
  }

  obtenerSubtotalFinal() {
    return this.producto.obtenerPrecioFinalUnitario() * this.cantidad;
  }

  obtenerSubtotalIva() {
    return this.producto.obtenerIva() * this.cantidad;
  }

  obtenerSubtotalDescuento() {
    const descuentoUnitario = this.producto.precio - this.producto.obtenerPrecioConDescuento();
    return descuentoUnitario * this.cantidad;
  }
}

// -----------------------------
// Estado de la aplicación
// -----------------------------


let listaProductos = [];


let carrito = [];

// -----------------------------
// Persistencia (localStorage y sessionStorage)
// -----------------------------

function guardarProductosEnLocalStorage() {
  localStorage.setItem(CLAVE_STORAGE_PRODUCTOS, JSON.stringify(listaProductos));
}

function cargarProductosDeLocalStorage() {
  const datos = localStorage.getItem(CLAVE_STORAGE_PRODUCTOS);
  if (!datos) return null;
  try {
    const arr = JSON.parse(datos);
    return arr.map(
      (p) => new Producto(p.id, p.nombre, p.descripcion, p.precio, p.descuentoPorcentaje, p.imagenUrl)
    );
  } catch (e) {
    console.error("Error parseando productos de localStorage", e);
    return null;
  }
}

function guardarCarritoEnSession() {
  const serializable = carrito.map((item) => ({ id: item.producto.id, cantidad: item.cantidad }));
  sessionStorage.setItem(CLAVE_SESSION_CARRITO, JSON.stringify(serializable));
}

function cargarCarritoDeSession() {
  const datos = sessionStorage.getItem(CLAVE_SESSION_CARRITO);
  if (!datos) return [];
  try {
    const arr = JSON.parse(datos);
    const items = [];
    for (const { id, cantidad } of arr) {
      const prod = listaProductos.find((p) => p.id === id);
      if (prod) items.push(new ItemCarrito(prod, cantidad));
    }
    return items;
  } catch (e) {
    console.error("Error parseando carrito de sessionStorage", e);
    return [];
  }
}

// -----------------------------
// Datos iniciales (3 productos de prueba)
// -----------------------------

function obtenerProductosDePrueba() {
  return [
    new Producto(
      1,
      "Auriculares Inalámbricos",
      "Auriculares Bluetooth con cancelación de ruido y estuche de carga.",
      45999,
      10,
      "https://http2.mlstatic.com/D_NQ_NP_604212-MLA52431995682_112022-O.webp"
    ),
    new Producto(
      2,
      "Teclado Mecánico RGB",
      "Teclado mecánico con switches rojos y retroiluminación RGB.",
      79999,
      5,
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8"
    ),
    new Producto(
      3,
      "Mouse Gamer 7200 DPI",
      "Mouse ergonómico con 7 botones programables.",
      25999,
      0,
      "https://static.bidcom.com.ar/publicacionesML/productos/GAMER097/1000x1000-GAMER097.jpg"
    ),
  ];
}

function restablecerProductosDePrueba() {
  listaProductos = obtenerProductosDePrueba();
  guardarProductosEnLocalStorage();
  renderizarProductos();
}

// -----------------------------
// DOM - Referencias
// -----------------------------

const contenedorProductos = document.getElementById("contenedor-productos");
const tablaCarrito = document.getElementById("tabla-carrito");
const totalCarritoSpan = document.getElementById("total-carrito");
const cantidadItemsBadge = document.getElementById("cantidad-items");
const textoFechaHora = document.getElementById("texto-fecha-hora");

// Formulario
const inputId = document.getElementById("producto-id");
const inputNombre = document.getElementById("producto-nombre");
const inputDescripcion = document.getElementById("producto-descripcion");
const inputPrecio = document.getElementById("producto-precio");
const inputDescuento = document.getElementById("producto-descuento");
const inputImagen = document.getElementById("producto-imagen");
const botonGuardar = document.getElementById("boton-guardar");
const botonCancelar = document.getElementById("boton-cancelar");
const botonVaciar = document.getElementById("boton-vaciar");
const botonFinalizar = document.getElementById("boton-finalizar");
const botonRestablecer = document.getElementById("boton-restablecer-productos");

// -----------------------------
// Renderizado de productos y carrito
// -----------------------------

function crearCardProducto(producto) {
  const tieneDescuento = producto.descuentoPorcentaje > 0;
  const precioDescuento = producto.obtenerPrecioConDescuento();
  const precioFinal = producto.obtenerPrecioFinalUnitario();

  const col = document.createElement("div");
  col.className = "col";

  const card = document.createElement("div");
  card.className = "card h-100 producto-card shadow-sm";

  const img = document.createElement("img");
  img.src = producto.imagenUrl ||
    "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop";
  img.alt = producto.nombre;
  img.className = "producto-imagen";
  img.loading = "lazy";
  card.appendChild(img);

  if (tieneDescuento) {
    const badge = document.createElement("span");
    badge.className = "badge text-bg-danger badge-descuento";
    badge.textContent = `-${producto.descuentoPorcentaje}%`;
    card.appendChild(badge);
  }

  const cuerpo = document.createElement("div");
  cuerpo.className = "card-body d-flex flex-column";
  cuerpo.innerHTML = `
    <h6 class="card-title mb-1">${producto.nombre}</h6>
    <p class="card-text small text-muted flex-grow-1">${producto.descripcion}</p>
    <div class="mb-2">
      ${tieneDescuento ? `<span class="precio-base me-2">${formatearMoneda(producto.precio)}</span>` : ""}
      <span class="precio-final">${formatearMoneda(precioDescuento)}</span>
      <span class="text-muted small">+ IVA</span>
    </div>
  `;

  const pie = document.createElement("div");
  pie.className = "card-footer bg-white border-0 pt-0 d-flex gap-2";

  const btnAgregar = document.createElement("button");
  btnAgregar.className = "btn btn-primary btn-sm flex-grow-1";
  btnAgregar.textContent = "Agregar al carrito";
  btnAgregar.addEventListener("click", () => agregarAlCarrito(producto.id));

  const btnEditar = document.createElement("button");
  btnEditar.className = "btn btn-outline-secondary btn-sm";
  btnEditar.textContent = "Editar";
  btnEditar.addEventListener("click", () => cargarProductoEnFormulario(producto.id));

  const btnBorrar = document.createElement("button");
  btnBorrar.className = "btn btn-outline-danger btn-sm";
  btnBorrar.textContent = "Borrar";
  btnBorrar.addEventListener("click", () => eliminarProducto(producto.id));

  pie.appendChild(btnAgregar);
  pie.appendChild(btnEditar);
  pie.appendChild(btnBorrar);

  card.appendChild(cuerpo);
  card.appendChild(pie);
  col.appendChild(card);

  return col;
}

function renderizarProductos() {
  contenedorProductos.innerHTML = "";
  if (listaProductos.length === 0) {
    contenedorProductos.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">No hay productos. Agrega nuevos con el formulario.</div>
      </div>`;
    return;
  }
  const fragmento = document.createDocumentFragment();
  for (const producto of listaProductos) {
    fragmento.appendChild(crearCardProducto(producto));
  }
  contenedorProductos.appendChild(fragmento);
}

function renderizarCarrito() {
  tablaCarrito.innerHTML = "";
  let total = 0;
  let cantidadTotal = 0;

  for (const item of carrito) {
    const tr = document.createElement("tr");
    const precioFinalUnit = item.producto.obtenerPrecioFinalUnitario();
    const ivaUnit = item.producto.obtenerIva();
    const descUnit = item.producto.precio - item.producto.obtenerPrecioConDescuento();

    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${item.producto.imagenUrl}" alt="${item.producto.nombre}" width="40" height="40" style="object-fit:cover;border-radius:6px;"/>
          <div>
            <div class="fw-semibold small">${item.producto.nombre}</div>
            <div class="text-muted small">${formatearMoneda(item.producto.obtenerPrecioConDescuento())} + IVA</div>
          </div>
        </div>
      </td>
      <td style="width:110px;">
        <div class="input-group input-group-sm">
          <button class="btn btn-outline-secondary" data-accion="restar">-</button>
          <input class="form-control text-center" type="number" min="1" value="${item.cantidad}" />
          <button class="btn btn-outline-secondary" data-accion="sumar">+</button>
        </div>
      </td>
      <td class="small">${formatearMoneda(precioFinalUnit)}</td>
      <td class="small">${formatearMoneda(ivaUnit)}</td>
      <td class="small">${descUnit > 0 ? formatearMoneda(descUnit) : "-"}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger">Quitar</button>
      </td>
    `;

    const [btnRestar, inputCantidad, btnSumar] = tr.querySelectorAll("button, input");
    btnRestar.addEventListener("click", () => actualizarCantidad(item.producto.id, item.cantidad - 1));
    btnSumar.addEventListener("click", () => actualizarCantidad(item.producto.id, item.cantidad + 1));
    inputCantidad.addEventListener("change", () => {
      const nueva = parseInt(inputCantidad.value, 10);
      if (Number.isNaN(nueva) || nueva < 1) return;
      actualizarCantidad(item.producto.id, nueva);
    });
    tr.querySelector(".btn-outline-danger").addEventListener("click", () => quitarDelCarrito(item.producto.id));

    cantidadTotal += item.cantidad;
    total += item.obtenerSubtotalFinal();
    tablaCarrito.appendChild(tr);
  }

  cantidadItemsBadge.textContent = String(cantidadTotal);
  totalCarritoSpan.textContent = formatearMoneda(total);

  guardarCarritoEnSession();
}

// -----------------------------
// CRUD de productos
// -----------------------------

function generarNuevoIdProducto() {
  const ids = listaProductos.map((p) => p.id);
  const maxId = ids.length ? Math.max(...ids) : 0;
  return maxId + 1;
}

function limpiarFormulario() {
  inputId.value = "";
  inputNombre.value = "";
  inputDescripcion.value = "";
  inputPrecio.value = "";
  inputDescuento.value = "0";
  inputImagen.value = "";
  botonCancelar.disabled = true;
  botonGuardar.textContent = "Guardar producto";
}

function cargarProductoEnFormulario(id) {
  const producto = listaProductos.find((p) => p.id === id);
  if (!producto) return;
  inputId.value = String(producto.id);
  inputNombre.value = producto.nombre;
  inputDescripcion.value = producto.descripcion;
  inputPrecio.value = String(producto.precio);
  inputDescuento.value = String(producto.descuentoPorcentaje);
  inputImagen.value = producto.imagenUrl;
  botonCancelar.disabled = false;
  botonGuardar.textContent = "Actualizar producto";
}

function eliminarProducto(id) {
  const producto = listaProductos.find((p) => p.id === id);
  if (!producto) return;
  mostrarConfirmacion(
    "¿Eliminar producto?",
    `Se eliminará "${producto.nombre}" de la tienda` ,
    () => {
      listaProductos = listaProductos.filter((p) => p.id !== id);
      guardarProductosEnLocalStorage();
      renderizarProductos();
      // Al borrar un producto, también lo quitamos del carrito
      carrito = carrito.filter((item) => item.producto.id !== id);
      renderizarCarrito();
      mostrarAlertaExito("Producto eliminado");
    }
  );
}

document.getElementById("form-producto").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nombre = inputNombre.value.trim();
  const descripcion = inputDescripcion.value.trim();
  const precio = Number(inputPrecio.value);
  const descuento = Number(inputDescuento.value);
  const imagen = inputImagen.value.trim();

  if (!nombre || !descripcion || Number.isNaN(precio) || precio < 0 || descuento < 0 || descuento > 100) {
    mostrarAlertaError("Verifica los datos del formulario.");
    return;
  }

  const idExistente = inputId.value ? Number(inputId.value) : null;
  if (idExistente) {
    // Actualizar
    const producto = listaProductos.find((p) => p.id === idExistente);
    if (!producto) return;
    producto.nombre = nombre;
    producto.descripcion = descripcion;
    producto.precio = precio;
    producto.descuentoPorcentaje = descuento;
    producto.imagenUrl = imagen;
    guardarProductosEnLocalStorage();
    renderizarProductos();
    renderizarCarrito();
    mostrarAlertaExito("Producto actualizado");
  } else {
    // Crear
    const nuevo = new Producto(generarNuevoIdProducto(), nombre, descripcion, precio, descuento, imagen);
    listaProductos.push(nuevo);
    guardarProductosEnLocalStorage();
    renderizarProductos();
    mostrarAlertaExito("Producto agregado");
  }
  limpiarFormulario();
});

botonCancelar.addEventListener("click", () => limpiarFormulario());
botonRestablecer.addEventListener("click", () => {
  mostrarConfirmacion(
    "¿Restablecer productos?",
    "Se cargarán nuevamente los 3 productos de prueba.",
    () => {
      restablecerProductosDePrueba();
      mostrarAlertaExito("Productos de prueba restablecidos.");
    }
  );
});

// -----------------------------
// Carrito de compras
// -----------------------------

function agregarAlCarrito(idProducto) {
  const producto = listaProductos.find((p) => p.id === idProducto);
  if (!producto) return;

  const existente = carrito.find((item) => item.producto.id === idProducto);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push(new ItemCarrito(producto, 1));
  }
  renderizarCarrito();
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: `${producto.nombre} agregado al carrito`,
    showConfirmButton: false,
    timer: 1200,
  });
}

function actualizarCantidad(idProducto, nuevaCantidad) {
  const item = carrito.find((i) => i.producto.id === idProducto);
  if (!item) return;
  if (nuevaCantidad < 1) {
    quitarDelCarrito(idProducto);
    return;
  }
  item.cantidad = nuevaCantidad;
  renderizarCarrito();
}

function quitarDelCarrito(idProducto) {
  carrito = carrito.filter((i) => i.producto.id !== idProducto);
  renderizarCarrito();
}

botonVaciar.addEventListener("click", () => {
  if (carrito.length === 0) return;
  mostrarConfirmacion("¿Vaciar carrito?", "Se eliminarán todos los productos del carrito.", () => {
    carrito = [];
    renderizarCarrito();
    mostrarAlertaExito("Carrito vaciado");
  });
});

botonFinalizar.addEventListener("click", async () => {
  if (carrito.length === 0) {
    mostrarAlertaError("El carrito está vacío.");
    return;
  }
  // Simulamos una operación asincrónica (ej: enviar pedido)
  try {
    const { total, cantidadTotal } = calcularResumenCarrito();
    await simularPagoAsync(total);
    Swal.fire({
      icon: "success",
      title: "Compra realizada",
      html: `Se procesó el pago de <b>${formatearMoneda(total)}</b> para <b>${cantidadTotal}</b> items.`,
    });
    carrito = [];
    renderizarCarrito();
  } catch (e) {
    mostrarAlertaError("No se pudo finalizar la compra. Intenta nuevamente.");
  }
});

function calcularResumenCarrito() {
  let total = 0;
  let cantidadTotal = 0;
  for (const item of carrito) {
    total += item.obtenerSubtotalFinal();
    cantidadTotal += item.cantidad;
  }
  return { total, cantidadTotal };
}

function simularPagoAsync(monto) {
  return new Promise((resolve, reject) => {
    // Callback de validación previa
    const esMontoValido = (valor, callback) => {
      const valido = typeof valor === "number" && valor > 0;
      callback(valido);
    };
    esMontoValido(monto, (ok) => {
      if (!ok) return reject(new Error("Monto inválido"));
      setTimeout(() => resolve(true), 1200);
    });
  });
}

// -----------------------------
// Fetch: Fecha y hora de Argentina
// -----------------------------

async function obtenerFechaHoraArgentina() {
  try {
    const resp = await fetch("https://worldtimeapi.org/api/timezone/America/Argentina/Buenos_Aires");
    if (!resp.ok) throw new Error("Error consultando hora");
    const data = await resp.json();
    const fecha = new Date(data.datetime);
    const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "America/Argentina/Buenos_Aires",
    });
    textoFechaHora.textContent = formateadorFecha.format(fecha);
  } catch (e) {
    textoFechaHora.textContent = "No se pudo obtener la hora de Argentina";
  }
}

// -----------------------------
// Inicialización
// -----------------------------

function inicializarProductos() {
  const cargados = cargarProductosDeLocalStorage();
  if (cargados && Array.isArray(cargados) && cargados.length) {
    listaProductos = cargados;
  } else {
    listaProductos = obtenerProductosDePrueba();
    guardarProductosEnLocalStorage();
  }
}

function inicializarCarrito() {
  carrito = cargarCarritoDeSession();
}

function iniciarApp() {
  inicializarProductos();
  inicializarCarrito();
  renderizarProductos();
  renderizarCarrito();
  obtenerFechaHoraArgentina();
}

document.addEventListener("DOMContentLoaded", iniciarApp);


