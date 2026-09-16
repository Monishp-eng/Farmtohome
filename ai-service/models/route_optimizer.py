import math
from datetime import datetime
import urllib.request
import json

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

VEHICLE_FLEET = {
    'tata_ace': {
        'name': 'Tata Ace Mini Truck',
        'capacity_kg': 750,
        'speed_kmph': 40.0,
        'cost_per_km': 8.0,
        'co2_per_km': 0.18,
        'description': 'Ideal for urban intra-city fresh produce drops (< 750 kg)'
    },
    'bolero_maxi': {
        'name': 'Mahindra Bolero Maxi Truck',
        'capacity_kg': 1200,
        'speed_kmph': 45.0,
        'cost_per_km': 10.0,
        'co2_per_km': 0.22,
        'description': 'Medium payload inter-district transport (< 1,200 kg)'
    },
    'eicher_pro': {
        'name': 'Eicher Pro 14ft Commercial Truck',
        'capacity_kg': 4000,
        'speed_kmph': 50.0,
        'cost_per_km': 14.0,
        'co2_per_km': 0.35,
        'description': 'Heavy agricultural bulk mandi distributor (< 4,000 kg)'
    },
    'reefer_cold': {
        'name': 'Refrigerated Cold Chain Van',
        'capacity_kg': 10000,
        'speed_kmph': 42.0,
        'cost_per_km': 20.0,
        'co2_per_km': 0.45,
        'description': 'Temperature-controlled cold transit for delicate berries & dairy'
    }
}

class RouteOptimizer:
    def __init__(self):
        self.avg_speed_kmph = 40.0
        self.road_factor = 1.22  # Real road network detour factor vs straight line Haversine

    def _is_peak_traffic_hour(self):
        cur_hour = datetime.now().hour
        # Peak Indian city traffic: 8am-11am & 5pm-8pm
        return (8 <= cur_hour <= 11) or (17 <= cur_hour <= 20)

    def optimize(self, origin, destinations, vehicle_type='tata_ace', max_time_window_hrs=None):
        if not destinations:
            return {
                "optimized_order": [],
                "optimized_route": [origin],
                "total_distance_km": 0,
                "estimated_time_hrs": 0,
                "traffic_aware_eta_hrs": 0,
                "distance_saved_km": 0,
                "time_saved_hrs": 0,
                "route_segments": [],
                "vehicle_metrics": {
                    "vehicle_type": vehicle_type,
                    "capacity_kg": 750,
                    "total_load_kg": 0,
                    "utilization_pct": 0,
                    "capacity_exceeded": False
                }
            }

        # 1. Resolve Vehicle Specifications
        v_key = str(vehicle_type).lower().strip()
        if v_key not in VEHICLE_FLEET:
            v_key = 'tata_ace'
        v_spec = VEHICLE_FLEET[v_key]

        # 2. Check Capacity Constraints (CVRP)
        total_load_kg = 0.0
        for d in destinations:
            total_load_kg += float(d.get('demand_kg', d.get('quantity_kg', 50.0)))

        capacity_exceeded = total_load_kg > v_spec['capacity_kg']
        utilization_pct = min(100.0, round((total_load_kg / v_spec['capacity_kg']) * 100.0, 1))

        fleet_rec = None
        if capacity_exceeded:
            if total_load_kg <= 1200:
                fleet_rec = "Switch to Mahindra Bolero Maxi Truck (1,200 kg capacity)"
            elif total_load_kg <= 4000:
                fleet_rec = "Switch to Eicher Pro 14ft Commercial Truck (4,000 kg capacity)"
            else:
                fleet_rec = f"Multi-truck dispatch required: Recommend {math.ceil(total_load_kg / 4000)} Eicher trucks"

        # 3. Naive Baseline Distance (Sequential order)
        original_distance = 0.0
        curr = origin
        for dest in destinations:
            dist = haversine_distance(curr['lat'], curr['lng'], dest['lat'], dest['lng']) * self.road_factor
            original_distance += dist
            curr = dest

        # 4. Nearest Neighbor Heuristic with Perishability Priority
        unvisited = list(range(len(destinations)))
        current_loc = origin
        nn_order = []
        accumulated_time = 0.0

        while unvisited:
            def stop_score(idx):
                dest = destinations[idx]
                dist = haversine_distance(current_loc['lat'], current_loc['lng'], dest['lat'], dest['lng'])
                # Freshness / perishability constraint: penalize late delivery for tight perishable items
                perish_hrs = float(dest.get('perishability_hours', dest.get('expiry_hours', 24.0)))
                est_arrival = accumulated_time + (dist * self.road_factor / v_spec['speed_kmph'])
                urgency_penalty = 0.0
                if est_arrival > perish_hrs:
                    urgency_penalty = (est_arrival - perish_hrs) * 50.0  # high penalty for expired drops
                return dist + urgency_penalty

            nearest_idx = min(unvisited, key=stop_score)
            nn_order.append(nearest_idx)
            leg_dist = haversine_distance(current_loc['lat'], current_loc['lng'], destinations[nearest_idx]['lat'], destinations[nearest_idx]['lng']) * self.road_factor
            accumulated_time += leg_dist / v_spec['speed_kmph']
            current_loc = destinations[nearest_idx]
            unvisited.remove(nearest_idx)

        # 5. Apply 2-Opt TSP with Perishability Time Windows
        best_order = self._two_opt_time_windows(origin, destinations, nn_order, v_spec['speed_kmph'])

        # 6. Compute Traffic-Aware ETA & Route Segments
        is_peak = self._is_peak_traffic_hour()
        traffic_multiplier = 1.30 if is_peak else 1.05

        optimized_route = [origin]
        optimized_distance = 0.0
        route_segments = []
        cumulative_time = 0.0

        curr = origin
        all_perishability_met = True

        for idx in best_order:
            dest = destinations[idx]
            optimized_route.append(dest)

            dist = haversine_distance(curr['lat'], curr['lng'], dest['lat'], dest['lng']) * self.road_factor
            leg_std_hrs = dist / v_spec['speed_kmph']
            leg_traffic_hrs = leg_std_hrs * traffic_multiplier
            cumulative_time += leg_traffic_hrs

            perish_hrs = float(dest.get('perishability_hours', dest.get('expiry_hours', 24.0)))
            perish_met = cumulative_time <= perish_hrs
            if not perish_met:
                all_perishability_met = False

            route_segments.append({
                "from": curr.get('name', 'Origin'),
                "to": dest.get('name', 'Destination'),
                "from_coords": [curr['lat'], curr['lng']],
                "to_coords": [dest['lat'], dest['lng']],
                "distance_km": round(dist, 2),
                "estimated_time_hrs": round(leg_std_hrs, 2),
                "traffic_aware_eta_hrs": round(leg_traffic_hrs, 2),
                "cumulative_transit_hrs": round(cumulative_time, 2),
                "perishability_limit_hrs": perish_hrs,
                "perishability_met": perish_met,
                "drop_weight_kg": float(dest.get('demand_kg', dest.get('quantity_kg', 50.0)))
            })

            optimized_distance += dist
            curr = dest

        # Compute summary metrics
        total_std_hrs = optimized_distance / v_spec['speed_kmph']
        traffic_aware_eta_hrs = total_std_hrs * traffic_multiplier
        original_time_hrs = original_distance / v_spec['speed_kmph']
        dist_saved = max(0.0, original_distance - optimized_distance)
        time_saved = max(0.0, original_time_hrs - total_std_hrs)

        # ESG Carbon Emission Metrics (0.18 - 0.45 kg CO2 per km based on vehicle)
        co2_emissions_kg = round(optimized_distance * v_spec['co2_per_km'], 2)
        co2_saved_kg = round(dist_saved * v_spec['co2_per_km'], 2)
        fuel_saved_litres = round(dist_saved / 12.0, 1)  # ~12 km/L average efficiency

        return {
            "optimized_order": best_order,
            "optimized_route": optimized_route,
            "total_distance_km": round(optimized_distance, 2),
            "estimated_time_hrs": round(total_std_hrs, 2),
            "traffic_aware_eta_hrs": round(traffic_aware_eta_hrs, 2),
            "traffic_congestion_status": "Peak Rush Hour (+30% delay)" if is_peak else "Normal Flow (+5% variance)",
            "distance_saved_km": round(dist_saved, 2),
            "time_saved_hrs": round(time_saved, 2),
            "all_perishability_deadlines_met": all_perishability_met,
            "route_segments": route_segments,
            "vehicle_metrics": {
                "vehicle_type": v_key,
                "vehicle_name": v_spec['name'],
                "capacity_kg": v_spec['capacity_kg'],
                "total_load_kg": round(total_load_kg, 1),
                "utilization_pct": utilization_pct,
                "capacity_exceeded": capacity_exceeded,
                "fleet_recommendation": fleet_rec
            },
            "esg_carbon_metrics": {
                "co2_emissions_kg": co2_emissions_kg,
                "co2_saved_kg": co2_saved_kg,
                "fuel_saved_litres": fuel_saved_litres
            },
            "algorithm": "2-Opt TSP with Perishability Time Windows (TW-TSP) & Fleet Constraints"
        }

    def _two_opt_time_windows(self, origin, destinations, initial_order, speed_kmph):
        best_order = list(initial_order)
        improved = True
        iterations = 0

        while improved and iterations < 50:
            improved = False
            iterations += 1
            for i in range(len(best_order) - 1):
                for j in range(i + 1, len(best_order)):
                    if j - i == 1:
                        continue
                    new_order = best_order[:]
                    new_order[i:j] = best_order[j-1:i-1:-1] if i > 0 else best_order[j-1::-1]

                    curr_cost = self._route_cost_with_penalties(origin, destinations, best_order, speed_kmph)
                    new_cost = self._route_cost_with_penalties(origin, destinations, new_order, speed_kmph)

                    if new_cost < curr_cost:
                        best_order = new_order
                        improved = True
        return best_order

    def _route_cost_with_penalties(self, origin, destinations, order, speed_kmph):
        dist = 0.0
        time_elapsed = 0.0
        penalty = 0.0
        curr = origin

        for idx in order:
            dest = destinations[idx]
            d = haversine_distance(curr['lat'], curr['lng'], dest['lat'], dest['lng']) * self.road_factor
            dist += d
            time_elapsed += d / speed_kmph

            perish_hrs = float(dest.get('perishability_hours', dest.get('expiry_hours', 24.0)))
            if time_elapsed > perish_hrs:
                penalty += (time_elapsed - perish_hrs) * 100.0
            curr = dest

        return dist + penalty
