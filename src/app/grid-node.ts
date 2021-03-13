import { GridState } from "./grid-state.enum";

export class GridNode {
  private rowIndex: number;
  private colIndex: number;

  private _state: GridState = GridState.Receptive;
  private _nextState: GridState = GridState.Receptive;
  private daysInCurrentState: number = 0;

  constructor(rowIndex: number, colIndex: number) {
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
  }

  get state() {
    return this._state;
  }

  set state(newState: GridState) {
    this._state = newState;
  }

  get nextState() {
    return this._nextState;
  }

  set nextState(newState: GridState) {
    this._nextState = newState;
  }

  get isReceptive() {
    return this._state === GridState.Receptive;
  }

  get isExposed() {
    return this._state === GridState.Exposed;
  }

  get isInfected() {
    return this._state === GridState.Infected;
  }

  get isInfectious() {
    return this._state === GridState.Exposed || this._state === GridState.Infected;
  }

  startDay() {
    this._nextState = this._state;
  }

  endDay(daysIncubating: number, daysSymptomatic: number, allowDeaths: boolean, deathRate: number) {
    if (this.nextState !== this.state) {
      this.daysInCurrentState = 0;
      this.state = this.nextState;
    } else {
      this.daysInCurrentState++;

      if (this.isExposed) {
        if (this.daysInCurrentState >= daysIncubating) {
          this.state = GridState.Infected;
          this.daysInCurrentState = 0;
        }
      } else if (this.isInfected) {
        if (this.daysInCurrentState >= daysSymptomatic) {
          // if (overHospitalCapacity) {
          //   deathRate = deathRate * 2;
          // }
          if (!allowDeaths) {
            deathRate = 0;
          }

          if (Math.random() < deathRate) {
            this.state = GridState.Deceased;
          } else {
            this.state = GridState.Recovered;
          }

          this.daysInCurrentState = 0;
        }
      }
    }
  }

  tryToInfect(neighbor: GridNode, transProb: number) {
    // Can get infected ?    
    if (neighbor.isReceptive && Math.random() < transProb) {
      neighbor.nextState = GridState.Exposed;
    }
  }
}
