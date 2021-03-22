export enum GridState {
  Receptive = 0,
  Exposed = 1,
  Infected = 2,
  Recovered = 3,
  Deceased = 4,
}

export enum GridStateColor {
  Receptive = '#eeeeee',
  Exposed = 'rgba(255, 0, 0, 0.3)',
  Infected = 'rgba(255, 0, 0, 1)',
  Recovered = '#808080',
  Deceased = '#303030',
}
