const API = (() => {
  const URL = "http://localhost:3000";
  const headers = { "Content-Type": "application/json" };
  const getCart = () => {
    // define your method to get cart data
    return fetch(`${URL}/cart`).then((res) => res.json());
  };

  const getInventory = () => {
    // define your method to get inventory data
    return fetch(`${URL}/inventory`).then((res) => res.json());
  };

  const addToCart = (inventoryItem) => {
    // define your method to add an item to cart
    return fetch(`${URL}/cart`, {
      method: "POST",
      body: JSON.stringify(inventoryItem),
      headers,
    }).then((res) => res.json());
  };

  const updateCart = (id, newAmount) => {
    // define your method to update an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ amount: newAmount }),
      headers,
    }).then((res) => res.json());
  };

  const deleteFromCart = (id) => {
    // define your method to delete an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "DELETE",
      headers,
    }).then((res) => res.json());
  };

  const checkout = () => {
    // you don't need to add anything here
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  // implement your logic for Model
  class State {
    #onChange;
    #inventory;
    #cart;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }
    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }
    set inventory(newInventory) {
      this.#inventory = newInventory;
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }
  const {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  } = API;
  return {
    State,
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const View = (() => {
  // implement your logic for View
  const inventoryContainer = document.querySelector(".inventory-container ul");
  const cartContainer = document.querySelector(".cart-container ul");
  const checkoutBtn = document.querySelector(".checkout-btn");

  // rendering inventory
  const renderInventory = (inventory) => {
    let tempInventory = "";
    inventory.forEach(({ id, content }) => {
      const productTemplate = `
        <li id=${id}>
            <span class="product-title">${content}</span>
            <button class="btn-decrease">-</button>
            <span class="product-amount">0</span>
            <button class="btn-increase">+</button>
            <button class="btn-add-to-cart">add to cart</button>
          </li>
        `;
      tempInventory += productTemplate;
    });

    inventoryContainer.innerHTML = tempInventory;
  };


  // rendering cart
  const renderCart = (cart) => {
    let tempCart = "";
    cart.forEach(({ id, content, amount }) => {
      const productTemplate = `
         <li id="${id}">
            <span class="product-title">${content}</span>
            <span>x</span>
            <span class="product-amount">${amount}</span>
            <button class="btn-delete-from-cart">delete</button>
          </li>
        `;
        tempCart += productTemplate;
    });

    cartContainer.innerHTML = tempCart;
  };

  return {
    renderInventory,
    renderCart,
    inventoryContainer,
    cartContainer,
    checkoutBtn,
  };
})();

const Controller = ((model, view) => {
  // implement your logic for Controller
  const state = new model.State();

  // desctruring model and view objects
  const {
    getInventory,
    getCart,
    addToCart,
    updateCart,
    deleteFromCart,
    checkout,
  } = model;
  const {
    renderInventory,
    renderCart,
    inventoryContainer,
    cartContainer,
    checkoutBtn,
  } = view;

  const init = () => {
    // subscribing for cart changes
    state.subscribe(() => {
      renderCart(state.cart);
    });

    // getting all invetory and initial rendering
    getInventory().then((data) => {
      state.inventory = data;
      renderInventory(data);
    });

    // getting cart and storing in state
    // as we subscribe to cart change, it will renrender
    // when change happens
    getCart().then((data) => {
      state.cart = data;
    });
  };

  // handling inventory amount update
  // updating it just locally, just the text content
  const handleUpdateAmount = () => {
    // adding an eventlistener to the parent element
    // so we do not need to use loop here
    inventoryContainer.addEventListener("click", ({ target }) => {
      let amount;
      if (target.className === "btn-decrease") {
        amount = parseInt(target.nextSibling.nextSibling.textContent);
        if (amount > 0) {
          target.nextSibling.nextSibling.textContent = amount - 1;
        }
      }
      if (target.className === "btn-increase") {
        amount = parseInt(target.previousSibling.previousSibling.textContent);
        target.previousSibling.previousSibling.textContent = amount + 1;
      }
    });
  };


  // handling add product to cart feature
  const handleAddToCart = () => {
    // adding an eventlistener to the parent element
    // so we do not need to use loop here

    inventoryContainer.addEventListener("click", ({ target }) => {
      if (target.className === "btn-add-to-cart") {
        let amount = parseInt(
          target.parentNode.querySelector(":nth-child(3)").textContent
        );
        const itemInInventory = state.inventory.find(
          (item) => item.id === parseInt(target.parentElement.id)
        );
        const itemInCart = state.cart.find(
          (item) => item.id === parseInt(target.parentElement.id)
        );
        const item = {
          ...itemInInventory,
          amount,
        };

        // if item doesn't exist in cart, then add it to cart
        if (amount !== 0 && !itemInCart) {
          addToCart(item).then((res) => (state.cart = [...state.cart, res]));
        }

        // if exists, then update the amount of it
        // and updating the cart
        if (itemInCart) {
          amount += itemInCart.amount;
          updateCart(itemInCart.id, amount)
            .then((res) => getCart())
            .then((data) => (state.cart = data));
        }
      }
    });
  };

  const handleDelete = () => {
    cartContainer.addEventListener("click", ({ target }) => {
      if (target.className === "btn-delete-from-cart") {
        const id = target.parentElement.id;
        deleteFromCart(id)
          .then((res) => getCart())
          .then((res) => (state.cart = res));
      }
    });
  };

  const handleCheckout = () => {
    checkoutBtn.addEventListener("click", (e) => {
      checkout().then((res) => (state.cart = []));
    });
  };
  const bootstrap = () => {
    init();
    handleUpdateAmount();
    handleDelete();
    handleAddToCart();
    handleCheckout();
  };
  return {
    bootstrap,
  };
})(Model, View);

Controller.bootstrap();
