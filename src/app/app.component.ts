import { Component, OnInit } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { BehaviorSubject, interval } from 'rxjs';
import { filter, switchMap, takeWhile } from 'rxjs/operators';
import { GridStateColor } from './grid-state.enum';
import { MetaParameter } from './meta-parameter';
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

  private metaParam: MetaParameter;
  public currentStepsPerSecond: number;
  public intervalPeriod: BehaviorSubject<number>;

  public lineChartData: ChartDataSets[] = [
    { data: [], label: 'Infektiös', stack: 'a' },
    { data: [], label: 'Geheilt', stack: 'a' },
    { data: [], label: 'Verstorben', stack: 'a' },
    { data: [], label: 'Gesund', stack: 'a' },
  ];

  public lineChartLabels: Label[] = [];

  public lineChartOptions: ChartOptions = {
    animation: {
      duration: 0 // performance
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      yAxes: [
        {
          stacked: true
        }
      ]
    }
  };

  public lineChartColors: Color[] = [
    {
      backgroundColor: 'rgba(255, 0, 0, 0.65)'
    },
    {
      backgroundColor: GridStateColor.Recovered
    },
    {
      backgroundColor: GridStateColor.Deceased
    },
    {
      backgroundColor: GridStateColor.Receptive
    }
  ];

  public resetStatistics() {
    this.lineChartData[0].data = [];
    this.lineChartData[1].data = [];
    this.lineChartData[2].data = [];
    this.lineChartData[3].data = [];

    this.lineChartLabels = [];
  }

  constructor(public simulationStepService: SimulationStepService) { }

  ngOnInit() {
    this.metaParam = this.simulationStepService.metaParam;
    this.currentStepsPerSecond = this.metaParam.stepsPerSecond;
    this.intervalPeriod = new BehaviorSubject<number>(1000 / this.currentStepsPerSecond);

    this.currentParams = { ...this.defaultSimulationParam };

    this.timerRunning = false;
    this.initInterval();

    this.simulationStepService.simulationEnded.subscribe(value => {
      this.simulationEnded = value;
    });

    this.simulationStepService.statistics.subscribe(value => {
      const newestStatistic = value[value.length - 1];
      
      // statisticForNg2Chart
      this.lineChartData[0].data?.push(newestStatistic.infectious);
      this.lineChartData[1].data?.push(newestStatistic.recovered);
      this.lineChartData[2].data?.push(newestStatistic.deceased);
      this.lineChartData[3].data?.push(newestStatistic.healthy);
      this.lineChartLabels.push(newestStatistic.day.toString());
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
    this.currentStepsPerSecond = this.metaParam.stepsPerSecond;
    this.intervalPeriod.next(1000 / this.metaParam.stepsPerSecond);
    
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
