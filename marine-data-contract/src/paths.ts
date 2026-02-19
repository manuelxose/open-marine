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
  },
  communication: {
    callsignVhf: "communication.callsignVhf",
  },
  propulsion: {
    main: {
      revolutions: "propulsion.main.revolutions",
      temperature: "propulsion.main.temperature",
      oilPressure: "propulsion.main.oilPressure",
    },
  },
  steering: {
    rudderAngle: "steering.rudderAngle",
    autopilot: {
      state: "steering.autopilot.state",
      target: {
        headingTrue: "steering.autopilot.target.headingTrue",
        headingMagnetic: "steering.autopilot.target.headingMagnetic",
        windAngleApparent: "steering.autopilot.target.windAngleApparent"
      }
    }
  },
  environment: {
    depth: {
      belowTransducer: "environment.depth.belowTransducer",
    },
    wind: {
      angleApparent: "environment.wind.angleApparent",
      speedApparent: "environment.wind.speedApparent",
      angleTrueGround: "environment.wind.angleTrueGround", // TWD (North referenced)
      angleTrueWater: "environment.wind.angleTrueWater",   // TWA (Bow referenced)
      speedTrue: "environment.wind.speedTrue",             // TWS
    },
  },
  electrical: {
    batteries: {
      house: {
        voltage: "electrical.batteries.house.voltage",
        current: "electrical.batteries.house.current",
      },
    },
  },
} as const;

type NestedValues<T> = T extends object
  ? {
      [K in keyof T]: NestedValues<T[K]>;
    }[keyof T]
  : T;

export type SignalKPath = NestedValues<typeof PATHS>;
