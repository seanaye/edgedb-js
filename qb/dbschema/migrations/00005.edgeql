CREATE MIGRATION m1baxqhsiyskmz5pch3gwyi57r2f5j3yswwniqlktkw2eg6usxuima
    ONTO m15beoho5bjejmlmbvf4lxmxebksdqbktggbkiohkbcipzjtqo4ola
{
  CREATE TYPE default::X {
      CREATE PROPERTY a -> std::str;
      CREATE PROPERTY b -> std::int32;
  };
  CREATE TYPE default::Y {
      CREATE PROPERTY a -> std::str;
      CREATE PROPERTY c -> std::bool;
  };
  CREATE TYPE default::Z {
      CREATE LINK xy -> (default::X | default::Y);
  };
};
