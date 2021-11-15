'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;

// App classı oluşturularak kodu daha düzenli hale getiriyoruz.
// Fonksiyonları class içinde methodlar olarak yazarak her bir fonksiyonu küçük fonksiyonlar haline getiriyoruz. Bunun bize sağladığı fayda o küçük methodları başka methodlar içinde çağırmak istediğimizde direkt olarak method adını yazarak ulaşabilecek olmamız. Ancak bir method içerisinde başka bir methodu callback olarak çağırmak istediğimizde bind methodu ile this keywordunu App class'ı olarak belirlememiz gerekiyor.
// Ayrıca App class'ı oluşturulduğunda çalışmasını istediğimiz fonksiyon/method varsa o methodu constructor'ın içine yazmamız gerekiyor çünkü class ile bir nesne oluşturulduğunda otomatik çalışan fonksiyon constructor.
// bir variable'ı ya da methodu diğer methodlarda çağırmak için this keywordunu method/variabledan önce yazmamız gerekiyor.

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // stringe çevirip son 10 hanesini id yapıyoruz.

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//////////////////////////////////////////////////////////////////////////////////

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadance) {
    super(coords, distance, duration);
    this.cadance = cadance;
    //  this.type = "running";
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycle1);

/////////////////////////////////////APP ARCHITECTUTE/////////////////////////////////////////////

class App {
  #map; // class içinde kullanılcak global variable oluşturuluyor.Global olarak tanımlanmasının sebebi diğer methodlarda da kullanılabilmesini sağlamak.
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition(); // get users position

    this._getLocalStorage(); // get local data

    form.addEventListener('submit', this._newWorkout.bind(this)); // attach event listeners
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position');
      }
    ); // iki tane callback fonksiyonu alır(1.si lokasyon- parametre de alıyor/ ikincisi lokasyonu almada başarısız olursa error fonksiyonu çalıştırmak için)
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude]; // kullanıcının koordinatları alınır.

    this.#map = L.map('map').setView(coords, 15); // HTML'de map id'li element olması gerekiyor. ve gösterilcek haritaya koordinatlar girilir. zoom seviyesi belirlenir.

    this.#workouts.forEach(work => {
      // renders to the map local storage data // constructorda map tanımlanmadığı için tanımlandıktan sonra markerlaerı haritaya ekliyoruz.
      this._renderWorkoutMarker(work);
    });

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords) // markera koordinatlar girilir
    //   .addTo(map)
    //   .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
    //   .openPopup();

    this.#map.on('click', this._showForm.bind(this));
    // on fonksiyonu leaflet kütüphanesinin bir fonksiyonu haritaya tıklandığında callback fonksiyonu çalışır.
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // console.log(this.#mapEvent); //parametre tıklanan yerle ilgili bilgileri içerir

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // HELPER FUNCTIONS
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const clickedCoords = [
      this.#mapEvent.latlng.lat,
      this.#mapEvent.latlng.lng,
    ]; // tıklanan yerin latitude ve  longitude bilgileri alınır.

    //get data from the form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // if workout is running , create running obj

    let workout;

    if (type === 'running') {
      const cadance = +inputCadence.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, cadance) ||
        !isPositive(distance, duration, cadance)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running(clickedCoords, distance, duration, cadance);
    }

    // if workout is cycling , create cycling obj

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !isPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling(clickedCoords, distance, duration, elevation);
    }

    // add new object to workout array

    this.#workouts.push(workout);
    console.log(workout);

    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    // hide form + clear input fields
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';

    // hide form after submitting
    form.classList.add('hidden');

    // set local storage to all workouts
    this._setLocalStorage();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // workout arrayini stringe çeviriyor.
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
       <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadance}</span>
             <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
      // form.insertAdjacentHTML('afterend', html);
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    // render workout on the map as marker
    // inputlar submit oldğunda markerı göster

    L.marker(workout.coords) // markera tıklanan koordinatlar girilir ve haritada işaret oluşturulur.
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }) // haritaya tıklandığında karşımıza çıkan popupı düzenleyebiliriz.
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    // console.log(workoutEl);

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, 15);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
