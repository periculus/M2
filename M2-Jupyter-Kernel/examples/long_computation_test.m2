-- Test script for long-running M2 computations
-- This helps verify the heartbeat mechanism prevents connection timeouts

-- Create a function that takes time to compute
longComputation = n -> (
    print "Starting long computation...";
    result := 0;
    for i from 1 to n do (
        -- Simulate work
        for j from 1 to 1000000 do result = result + 1;
        if i % 10 == 0 then print("Progress: " | toString(i) | "/" | toString(n));
    );
    print "Computation complete!";
    result
)

-- Test with 40 second computation (exceeds 30s websocket timeout)
print "Testing 40-second computation...";
time longComputation(40)

-- Another approach: Complex mathematical computation
R = QQ[x,y,z,w];
I = ideal(x^5 + y^3 + z^2 + w, x^3*y + y^5 + z^3 + w^2, x*y*z + y^3*z + z^5 + w^3);
print "Computing Gröbner basis of complex ideal (may take time)...";
time gb I

print "All tests completed successfully!"