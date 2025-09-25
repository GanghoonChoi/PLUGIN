import React from "react";

import "./content.css";

export const Content = (props) => {
  return (
    <sp-body>
      <div className="plugin-content">
        {props.message.map((item, index) => {
          return <div key={index}>{item}</div>;
        })}
      </div>
    </sp-body>
  );
};
