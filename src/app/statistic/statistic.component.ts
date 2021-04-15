import { Component, OnInit } from '@angular/core';
import { SimulationStepService } from '../simulation-step.service';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { GridStateColor } from '../grid-state.enum';

@Component({
  selector: 'app-statistic',
  templateUrl: './statistic.component.html',
  styleUrls: ['./statistic.component.scss']
})
export class StatisticComponent implements OnInit {

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

  constructor(public simulationStepService: SimulationStepService) { }

  ngOnInit() {
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

  public resetStatistics() {
    this.lineChartData[0].data = [];
    this.lineChartData[1].data = [];
    this.lineChartData[2].data = [];
    this.lineChartData[3].data = [];

    this.lineChartLabels = [];
  }
}
