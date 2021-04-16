import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { filter, switchMap, takeWhile } from 'rxjs/operators';
import { SimulationParameter } from './simulation-parameter';
import { SimulationStepService } from './simulation-step.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  public timerRunning: boolean;
  public simulationEnded: boolean;

  private readonly defaultSimulationParam: SimulationParameter = {
    daysIncubated: 3,
    daysSymptomatic: 2,
    isolationRateSymptomatic: 0.3,
    transmissionProbability: 0.35,
    deathRate: 0.1,
    movementRadius: 1,
    numberOfContacts: 4,
    reInfectionRate: 0.05,
  };
  public currentParams: SimulationParameter;

  public currentStepsPerSecond: number;
  public intervalPeriod: BehaviorSubject<number>;

  constructor(public simulationStepService: SimulationStepService) { }

  public ngOnInit() {
    this.currentStepsPerSecond = this.simulationStepService.metaParam.stepsPerSecond;
    this.intervalPeriod = new BehaviorSubject<number>(1000 / this.currentStepsPerSecond);

    this.currentParams = { ...this.defaultSimulationParam };

    this.timerRunning = false;
    this.initInterval();

    this.simulationStepService.simulationEnded.subscribe(value => {
      this.simulationEnded = value;
    });
  }

  private initInterval() {
    this.intervalPeriod
      .pipe(
        switchMap(period => interval(period)),
        filter(() => this.timerRunning),
        takeWhile(() => !this.simulationEnded),
      ).subscribe(val => {
        this.simulationStepService.simulateStep(this.currentParams);
      });
  }

  public reset() {
    this.currentParams = { ...this.defaultSimulationParam };
    this.currentStepsPerSecond = this.simulationStepService.metaParam.stepsPerSecond;
    this.intervalPeriod.next(1000 / this.currentStepsPerSecond);
    
    this.simulationStepService.reset();
    this.timerRunning = false;
    this.initInterval();
  }

  public toggleSimulationExecution() {
    this.timerRunning = !this.timerRunning;
  }

  public singleStep() {
    this.simulationStepService.simulateStep(this.currentParams);
  }
}
