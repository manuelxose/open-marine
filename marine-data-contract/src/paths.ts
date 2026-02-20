export const PATHS = {
  name: "name",
  navigation: {
    position: "navigation.position",
    speedOverGround: "navigation.speedOverGround",
    speedThroughWater: "navigation.speedThroughWater",
    courseOverGroundTrue: "navigation.courseOverGroundTrue",
    headingTrue: "navigation.headingTrue",
    headingMagnetic: "navigation.headingMagnetic",
    destination: "navigation.destination",
    attitude: "navigation.attitude",
    leeway: "navigation.leeway",
    currentSet: "navigation.current.setTrue",
    currentDrift: "navigation.current.drift",
    trip: {
      log: "navigation.trip.log",
      lastReset: "navigation.trip.lastReset",
    },
    gnss: {
      satellites: "navigation.gnss.satellites",
      horizontalDilution: "navigation.gnss.horizontalDilution",
      type: "navigation.gnss.type",
    },
  },
  communication: {
    callsignVhf: "communication.callsignVhf",
  },
  propulsion: {
    main: {
      revolutions: "propulsion.main.revolutions",
      temperature: "propulsion.main.temperature",
      oilPressure: "propulsion.main.oilPressure",
      fuelRate: "propulsion.main.fuel.rate",
      runTime: "propulsion.main.runTime",
      transmission: "propulsion.main.transmission.gear",
    },
  },
  tanks: {
    fuel: {
      level: "tanks.fuel.0.currentLevel",
    },
  },
  steering: {
    rudderAngle: "steering.rudderAngle",
    autopilot: {
      state: "steering.autopilot.state",
      target: {
        headingTrue: "steering.autopilot.target.headingTrue",
        headingMagnetic: "steering.autopilot.target.headingMagnetic",
        windAngleApparent: "steering.autopilot.target.windAngleApparent",
      },
    },
  },
  environment: {
    depth: {
      belowTransducer: "environment.depth.belowTransducer",
      belowSurface: "environment.depth.belowSurface",
      belowKeel: "environment.depth.belowKeel",
    },
    wind: {
      angleApparent: "environment.wind.angleApparent",
      speedApparent: "environment.wind.speedApparent",
      angleTrueGround: "environment.wind.angleTrueGround",
      angleTrueWater: "environment.wind.angleTrueWater",
      speedTrue: "environment.wind.speedTrue",
      directionTrue: "environment.wind.directionTrue",
    },
    water: {
      temperature: "environment.water.temperature",
    },
    outside: {
      temperature: "environment.outside.temperature",
      pressure: "environment.outside.pressure",
      humidity: "environment.outside.humidity",
    },
  },
  electrical: {
    batteries: {
      house: {
        voltage: "electrical.batteries.house.voltage",
        current: "electrical.batteries.house.current",
        stateOfCharge: "electrical.batteries.house.capacity.stateOfCharge",
      },
      alternator: {
        current: "electrical.batteries.alternator.current",
      },
    },
    solar: {
      voltage: "electrical.solar.0.voltage",
      current: "electrical.solar.0.current",
    },
  },
  performance: {
    polarSpeed: "performance.polarSpeed",
    polarSpeedRatio: "performance.polarSpeedRatio",
    targetTwa: "performance.targetAngle",
    velocityMadeGood: "performance.velocityMadeGood",
  },
} as const;

type NestedValues<T> = T extends object
  ? {
      [K in keyof T]: NestedValues<T[K]>;
    }[keyof T]
  : T;

export type SignalKPath = NestedValues<typeof PATHS>;
