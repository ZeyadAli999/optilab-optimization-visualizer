import type { AcoParams, AcoResult, Point } from "./types";

export function generateCities(count: number): Point[] {
  const safeCount = Math.min(16, Math.max(4, Math.round(count)));
  return Array.from({ length: safeCount }, (_, index) => {
    const angle = (2 * Math.PI * index) / safeCount;
    const radius = 1 + 0.28 * Math.sin(index * 1.9);
    return {
      x: 0.5 + 0.42 * radius * Math.cos(angle),
      y: 0.5 + 0.38 * radius * Math.sin(angle) + 0.05 * Math.cos(index * 2.7)
    };
  });
}

export function createDistanceMatrix(cities: Point[]) {
  return cities.map((a, i) =>
    cities.map((b, j) => (i === j ? 0 : Math.hypot(a.x - b.x, a.y - b.y)))
  );
}

export function routeLength(route: number[], distances: number[][]) {
  return route.reduce((sum, city, index) => {
    const next = route[(index + 1) % route.length];
    return sum + distances[city][next];
  }, 0);
}

export function transitionProbabilities(
  current: number,
  unvisited: number[],
  pheromone: number[][],
  distances: number[][],
  alpha: number,
  beta: number
) {
  const weights = unvisited.map((city) => {
    const tau = Math.max(pheromone[current][city], 1e-12) ** alpha;
    const eta = (1 / Math.max(distances[current][city], 1e-12)) ** beta;
    return tau * eta;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((weight, index) => ({
    city: unvisited[index],
    probability: total > 0 ? weight / total : 1 / unvisited.length
  }));
}

export function updatePheromones(
  pheromone: number[][],
  routes: Array<{ route: number[]; distance: number }>,
  rho: number,
  q: number
) {
  const next = pheromone.map((row) => row.map((value) => Math.max(1e-6, (1 - rho) * value)));
  routes.forEach(({ route, distance }) => {
    const deposit = q / Math.max(distance, 1e-12);
    route.forEach((city, index) => {
      const other = route[(index + 1) % route.length];
      next[city][other] += deposit;
      next[other][city] += deposit;
    });
  });
  return next;
}

export function runAco(cities: Point[], params: AcoParams, seed = 11): AcoResult {
  const started = performance.now();
  const issue = validateAcoInput(cities, params);
  if (issue) return emptyAcoResult(cities, started, issue);
  const safeParams = normalizeAcoParams(params);
  const distances = createDistanceMatrix(cities);
  let pheromone: number[][] = cities.map((_, i) => cities.map((__, j) => (i === j ? 0 : 1)));
  const rng = seeded(seed);
  let bestRoute: number[] = nearestNeighborRoute(distances, 0);
  let bestDistance = routeLength(bestRoute, distances);
  const initialBestDistance = bestDistance;
  const history = [];

  for (let iteration = 1; iteration <= safeParams.iterations; iteration += 1) {
    const antRoutes = Array.from({ length: safeParams.antCount }, (_, ant) =>
      constructRoute(ant % cities.length, pheromone, distances, safeParams.alpha, safeParams.beta, rng)
    ).map((route) => ({ route, distance: routeLength(route, distances) }));

    const iterationBest = antRoutes.reduce((best, candidate) =>
      candidate.distance < best.distance ? candidate : best
    , antRoutes[0]);
    if (iterationBest.distance < bestDistance) {
      bestRoute = iterationBest.route;
      bestDistance = iterationBest.distance;
    }

    pheromone = updatePheromones(pheromone, antRoutes, safeParams.rho, safeParams.q);
    history.push({
      iteration,
      bestRoute: [...bestRoute],
      bestDistance,
      iterationBestRoute: [...iterationBest.route],
      iterationBestDistance: iterationBest.distance,
      pheromone: cloneMatrix(pheromone),
      antRoutes: antRoutes.slice(0, Math.min(8, antRoutes.length))
    });
  }

  const random = randomSearch(distances, 180, seed + 5);
  const nearestNeighbor = {
    route: nearestNeighborRoute(distances, 0),
    distance: routeLength(nearestNeighborRoute(distances, 0), distances)
  };
  const bruteForce = cities.length <= 9 ? bruteForceTsp(distances) : undefined;

  return {
    cities,
    bestRoute,
    bestDistance,
    initialBestDistance,
    iterations: safeParams.iterations,
    evaluations: safeParams.iterations * safeParams.antCount,
    runtimeMs: performance.now() - started,
    history,
    random,
    nearestNeighbor,
    bruteForce,
    status: "completed"
  };
}

function validateAcoInput(cities: Point[], params: AcoParams) {
  if (!Number.isFinite(params.cityCount) || params.cityCount < 4 || params.cityCount > 16) return "Number of cities must be between 4 and 16.";
  if (!Number.isFinite(params.antCount) || params.antCount < 1 || params.antCount > 80) return "Number of ants must be between 1 and 80.";
  if (!Number.isFinite(params.iterations) || params.iterations < 1 || params.iterations > 200) return "ACO iterations must be between 1 and 200.";
  if (!Number.isFinite(params.alpha) || params.alpha < 0 || params.alpha > 6) return "α must be between 0 and 6.";
  if (!Number.isFinite(params.beta) || params.beta < 0 || params.beta > 8) return "Beta must be between 0 and 8.";
  if (!Number.isFinite(params.rho) || params.rho < 0.01 || params.rho > 0.95) return "Evaporation ρ must be between 0.01 and 0.95.";
  if (!Number.isFinite(params.q) || params.q < 1 || params.q > 500) return "Q deposit constant must be between 1 and 500.";
  if (cities.length < 4) return "At least four valid cities are required for the TSP demo.";
  if (cities.some((city) => !Number.isFinite(city.x) || !Number.isFinite(city.y))) return "City coordinates must be finite numbers.";
  return "";
}

function emptyAcoResult(cities: Point[], started: number, message: string): AcoResult {
  return {
    cities,
    bestRoute: [],
    bestDistance: NaN,
    initialBestDistance: NaN,
    iterations: 0,
    evaluations: 0,
    runtimeMs: performance.now() - started,
    history: [],
    random: { route: [], distance: NaN },
    nearestNeighbor: { route: [], distance: NaN },
    status: "invalid",
    message
  };
}

export function normalizeAcoParams(params: AcoParams): AcoParams {
  return {
    cityCount: Math.min(16, Math.max(4, Math.round(params.cityCount))),
    antCount: Math.min(80, Math.max(1, Math.round(params.antCount))),
    iterations: Math.min(200, Math.max(1, Math.round(params.iterations))),
    alpha: Math.min(6, Math.max(0, params.alpha)),
    beta: Math.min(8, Math.max(0, params.beta)),
    rho: Math.min(0.95, Math.max(0.01, params.rho)),
    q: Math.min(500, Math.max(1, params.q))
  };
}

function constructRoute(
  start: number,
  pheromone: number[][],
  distances: number[][],
  alpha: number,
  beta: number,
  rng: () => number
) {
  const route = [start];
  const unvisited = new Set(distances.map((_, index) => index).filter((index) => index !== start));
  while (unvisited.size > 0) {
    const current = route[route.length - 1];
    const candidates = [...unvisited];
    const probabilities = transitionProbabilities(current, candidates, pheromone, distances, alpha, beta);
    const next = sample(probabilities, rng);
    route.push(next);
    unvisited.delete(next);
  }
  return route;
}

function sample(probabilities: Array<{ city: number; probability: number }>, rng: () => number) {
  const target = rng();
  let cumulative = 0;
  for (const item of probabilities) {
    cumulative += item.probability;
    if (target <= cumulative) return item.city;
  }
  return probabilities.at(-1)?.city ?? 0;
}

function nearestNeighborRoute(distances: number[][], start: number) {
  const route = [start];
  const unvisited = new Set(distances.map((_, index) => index).filter((index) => index !== start));
  while (unvisited.size > 0) {
    const current = route[route.length - 1];
    const next = [...unvisited].reduce((best, candidate) =>
      distances[current][candidate] < distances[current][best] ? candidate : best
    );
    route.push(next);
    unvisited.delete(next);
  }
  return route;
}

function randomSearch(distances: number[][], trials: number, seed: number) {
  const rng = seeded(seed);
  const base = distances.map((_, index) => index);
  let bestRoute = [...base];
  let bestDistance = routeLength(bestRoute, distances);
  for (let i = 0; i < trials; i += 1) {
    const route = shuffle(base, rng);
    const distance = routeLength(route, distances);
    if (distance < bestDistance) {
      bestRoute = route;
      bestDistance = distance;
    }
  }
  return { route: bestRoute, distance: bestDistance };
}

function bruteForceTsp(distances: number[][]) {
  const rest = distances.map((_, index) => index).slice(1);
  let bestRoute = [0, ...rest];
  let bestDistance = routeLength(bestRoute, distances);
  permute(rest, (perm) => {
    const route = [0, ...perm];
    const distance = routeLength(route, distances);
    if (distance < bestDistance) {
      bestRoute = route;
      bestDistance = distance;
    }
  });
  return { route: bestRoute, distance: bestDistance };
}

function permute(values: number[], visit: (values: number[]) => void, start = 0) {
  if (start === values.length) {
    visit([...values]);
    return;
  }
  for (let i = start; i < values.length; i += 1) {
    [values[start], values[i]] = [values[i], values[start]];
    permute(values, visit, start + 1);
    [values[start], values[i]] = [values[i], values[start]];
  }
}

function shuffle(values: number[], rng: () => number) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cloneMatrix(matrix: number[][]) {
  return matrix.map((row) => [...row]);
}

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
