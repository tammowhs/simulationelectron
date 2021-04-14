import { GridState } from './grid-state.enum';
import { RandomService } from './random.service';

export class GridNode {
  public rowIndex: number;
  public colIndex: number;

  private _state: GridState = GridState.Receptive;
  private _nextState: GridState = GridState.Receptive;
  private daysInCurrentState = 0;

  private isolating = false;

  constructor(private randomService: RandomService, rowIndex: number, colIndex: number) {
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

  get isRecovered() {
    return this._state === GridState.Recovered;
  }

  get isDeceased() {
    return this._state === GridState.Deceased;
  }

  get isInfectious() {
    return this._state === GridState.Exposed || this._state === GridState.Infected;
  }

  get isIsolating() {
    return this.isolating;
  }

  // allowDeaths: boolean, deathRate: number
  evaluateNewState(daysIncubating: number, daysSymptomatic: number, deathRate: number, isolationRate: number) {
    if (this.nextState !== this.state) {
      this.daysInCurrentState = 0;
      this.state = this.nextState;
    } else {
      this.daysInCurrentState++;

      if (this.isExposed && this.daysInCurrentState >= daysIncubating) {
        this.state = GridState.Infected;
        this.daysInCurrentState = 0;
        if (this.randomService.random() < isolationRate) {
          this.isolating = true;
        }
      }

      if (this.isInfected && this.daysInCurrentState >= daysSymptomatic) {
        if (this.randomService.random() < deathRate) {
          this.state = GridState.Deceased;
        } else {
          this.state = GridState.Recovered;
        }

        this.daysInCurrentState = 0;
        this.isolating = false;
      }
    }
  }

  tryToInfect(contact: GridNode, transProb: number, reInfectionRate: number) {
    if (contact.isReceptive && this.randomService.random() < transProb
      || contact.isRecovered && this.randomService.random() < reInfectionRate) {
      contact.nextState = GridState.Exposed;
    }
  }
}
