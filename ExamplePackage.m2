newPackage(
    "ExamplePackage",
    Version => "1.0", 
    Date => "January 26, 2025",
    Authors => {
        {Name => "Your Name", 
         Email => "your.email@example.com", 
         HomePage => "https://example.com"}
    },
    Headline => "Example M2 package for development workflow",
    DebuggingMode => true
)

-- Export symbols
export {
    "exampleFunction",
    "ExampleType"
}

-- Define a simple type
ExampleType = new Type of HashTable

-- Constructor for ExampleType
exampleObject = method()
exampleObject ZZ := (n) -> (
    new ExampleType from {
        "value" => n,
        "squared" => n^2
    }
)

-- Main exported function
exampleFunction = method()
exampleFunction ZZ := (n) -> (
    if n < 0 then error "Input must be non-negative";
    obj := exampleObject(n);
    print("Created object with value " | toString(obj#"value"));
    obj
)

-- Documentation
beginDocumentation()

doc ///
Key
  ExamplePackage
Headline
  Example M2 package for development workflow
Description
  Text
    This is an example package to demonstrate the M2 development workflow
    with VS Code integration.
///

doc ///
Key
  exampleFunction
Headline
  Create an example object
Usage
  exampleFunction n
Inputs
  n:ZZ -- a non-negative integer
Outputs
  :ExampleType -- an object containing the value and its square
Description
  Text
    This function creates an example object from an integer.
  Example
    obj = exampleFunction 5
    obj#"value"
    obj#"squared"
///

-- Tests
TEST ///
obj = exampleFunction 3
assert(obj#"value" == 3)
assert(obj#"squared" == 9)
///

TEST ///
-- Test error handling
try (
    exampleFunction(-1);
    assert(false); -- Should not reach here
) else (
    -- Expected to throw error
    assert(true);
)
///

end