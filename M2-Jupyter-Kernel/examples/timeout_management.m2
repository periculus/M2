-- Timeout Management in M2 Jupyter Kernel
-- 
-- The kernel has a default timeout of 5 minutes for computations.
-- You can adjust this using the %timeout magic command.

-- Check current timeout
%timeout

-- Set a shorter timeout for quick operations
%timeout=10

-- Set a longer timeout for complex decompositions
%timeout=600

-- Example of a computation that needs more time
R = QQ[x,y,z,w]
I = ideal(x^3 + y^3 + z^3 + w^3 - 1, x^2*y + y^2*z + z^2*w + w^2*x, x*y*z + y*z*w + z*w*x + w*x*y)

-- This will now have 10 minutes to complete
decompose I

-- Reset to default
%timeout=300