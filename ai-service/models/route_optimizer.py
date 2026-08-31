from utils.preprocessing import haversine_distance

class RouteOptimizer:
    def __init__(self):
        self.avg_speed_kmph = 40.0

    def optimize(self, origin, destinations):
        if not destinations:
            return {
                "optimized_order": [],
                "optimized_route": [origin],
                "total_distance_km": 0,
                "estimated_time_hrs": 0,
                "distance_saved_km": 0,
                "time_saved_hrs": 0,
                "route_segments": []
            }

        # Original/Naive route: origin -> dest 1 -> dest 2 -> ... -> dest N
        original_distance = 0
        current_loc = origin
        for dest in destinations:
            dist = haversine_distance(current_loc['lat'], current_loc['lng'], dest['lat'], dest['lng'])
            original_distance += dist
            current_loc = dest
            
        # Nearest Neighbor Heuristic
        unvisited = list(range(len(destinations)))
        current_loc = origin
        nn_order = []
        
        while unvisited:
            nearest_idx = min(unvisited, key=lambda idx: haversine_distance(
                current_loc['lat'], current_loc['lng'], 
                destinations[idx]['lat'], destinations[idx]['lng']
            ))
            nn_order.append(nearest_idx)
            current_loc = destinations[nearest_idx]
            unvisited.remove(nearest_idx)
            
        # Apply 2-opt
        best_order = self._two_opt(origin, destinations, nn_order)
        
        # Calculate optimized route metrics
        optimized_route = [origin]
        optimized_distance = 0
        route_segments = []
        
        curr = origin
        for idx in best_order:
            dest = destinations[idx]
            optimized_route.append(dest)
            
            dist = haversine_distance(curr['lat'], curr['lng'], dest['lat'], dest['lng'])
            est_time = dist / self.avg_speed_kmph
            
            route_segments.append({
                "from": curr.get('name', 'Unknown'),
                "to": dest.get('name', 'Unknown'),
                "distance_km": round(dist, 2),
                "estimated_time_hrs": round(est_time, 2)
            })
            
            optimized_distance += dist
            curr = dest
            
        total_time_hrs = optimized_distance / self.avg_speed_kmph
        original_time_hrs = original_distance / self.avg_speed_kmph
        
        return {
            "optimized_order": best_order,
            "optimized_route": optimized_route,
            "total_distance_km": round(optimized_distance, 2),
            "estimated_time_hrs": round(total_time_hrs, 2),
            "distance_saved_km": round(original_distance - optimized_distance, 2),
            "time_saved_hrs": round(original_time_hrs - total_time_hrs, 2),
            "route_segments": route_segments
        }

    def _two_opt(self, origin, destinations, initial_order):
        best_order = list(initial_order)
        improved = True
        
        while improved:
            improved = False
            for i in range(len(best_order) - 1):
                for j in range(i + 1, len(best_order)):
                    if j - i == 1:
                        continue
                        
                    new_order = best_order[:]
                    new_order[i:j] = best_order[j-1:i-1:-1] if i > 0 else best_order[j-1::-1]
                    
                    if self._route_distance(origin, destinations, new_order) < self._route_distance(origin, destinations, best_order):
                        best_order = new_order
                        improved = True
        return best_order

    def _route_distance(self, origin, destinations, order):
        dist = 0
        curr = origin
        for idx in order:
            dest = destinations[idx]
            dist += haversine_distance(curr['lat'], curr['lng'], dest['lat'], dest['lng'])
            curr = dest
        return dist
