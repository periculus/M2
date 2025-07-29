-- Rich Mathematical Display Demo for M2 Jupyter Kernel
-- This notebook demonstrates the enhanced display features

-- 1. Help and Configuration
%help

-- 2. Control Logging (disable to reduce clutter)
%logging off

-- 3. Configure LaTeX Font Size
%fontsize=large

-- 4. Create Some Mathematical Objects
R = QQ[x,y,z,w]
-- Note how o1 is displayed prominently

-- Create an ideal
I = ideal(x^3 + y^3 + z^3 + w^3 - 1, x^2*y + y^2*z + z^2*w + w^2*x, x*y*z + y*z*w + z*w*x + w*x*y)
-- o2 is shown with the ideal

-- 5. Compute Gröbner Basis
gb I
-- o3 shows the Gröbner basis status

-- 6. Compute Resolution
res I
-- o4 displays the chain complex beautifully

-- 7. Decompose (with progress tracking)
decompose I
-- o5 shows the decomposition

-- 8. Reference Previous Results
-- You can use the oN variables:
J = o2  -- This references the ideal I
gb J    -- Computes GB of the same ideal

-- 9. Try Different Font Sizes
%fontsize=small
matrix{{1,2,3},{4,5,6},{7,8,9}}

%fontsize=Large
matrix{{x^2, y^2, z^2},{x*y, y*z, x*z}}

%fontsize=normalsize

-- 10. Complex Output Example
-- The output variables are preserved for reference
f = map(R^3, R^3, matrix{{x,y,z},{y,z,x},{z,x,y}})
ker f
coker f

-- All oN variables (o1, o2, ...) are available for reference
-- This allows interactive exploration as in Macaulay2Web