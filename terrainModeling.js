       function Terrain(size) {
        this.size =size+1;
        this.max = size;
        this.mid_value=1.5;
        this.map = new Float32Array((size+2)*(size+1));
        this.centre_cell=Math.floor(size/2);
      }

      Terrain.prototype.get = function(x, y) {
        if (x < 0 || x > this.max || y < 0 || y > this.max) return -1;
        return this.map[x + this.size * y];
      };

      Terrain.prototype.set = function(x, y, val) {
        this.map[x + this.size * y] = val;
      };

      Terrain.prototype.sset= function(x,y,val){
        if (!this.get(x,y)) {
          this.set(x,y,val);
        };
      }

       Terrain.prototype.generate = function() {
        var self = this;

        self.set(0, 0, self.mid_value);
        self.set(self.max, 0, self.mid_value);
        self.set(self.max, self.max, self.mid_value);
        self.set(0, self.max, self.mid_value);

        diamond_square(0,0, self.max, self.max, 2*self.mid_value);

        function diamond_square(left, top, right, bottom, base_height) {
           var x_centre = Math.floor((left + right) / 2);
           var y_centre = Math.floor((top + bottom) / 2);
           var centre_point_value = 
            (
              self.get(left, top) +
              self.get(right, top) +
              self.get(left, bottom) +
              self.get(right, bottom)
             ) / 4
              - (Math.random() - 0.5) * base_height * 2;
           
             self.sset(x_centre,y_centre,centre_point_value);
            
             self.sset(x_centre, top,      (self.get(left,  top)    + self.get(right, top)) / 2 + (Math.random() - 0.5) * base_height);
             self.sset(x_centre, bottom,   (self.get(left,  bottom) + self.get(right, bottom)) / 2 + (Math.random() - 0.5) * base_height);
             self.sset(left,     y_centre, (self.get(left,  top)    + self.get(left,  bottom)) / 2 + (Math.random() - 0.5) * base_height);
             self.sset(right,    y_centre, (self.get(right, top)    + self.get(right, bottom)) / 2 + (Math.random() - 0.5) * base_height);

             if (right - left> 2)
              base_height = base_height*Math.pow(2.0, -0.75);
             else
              return;

             diamond_square( left, top, x_centre, y_centre, base_height );
             diamond_square( x_centre, top, right, y_centre, base_height );
             diamond_square( left, y_centre, x_centre, bottom, base_height );
             diamond_square( x_centre, y_centre, right, bottom, base_height );

  }
}

    

function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{   
    var width = maxX-minX;
    var height =maxY-minY;
    var deltaX=width/n;
    var deltaY=height/n;
    var terrain = new Terrain(n);
    terrain.generate();
    
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {   
           var x=minX+deltaX*j;
           var y=minY+deltaY*i;
           var val=terrain.get(j,i);
           // document.write(val+'a');
           var val1=terrain.get(j+1,i);
           var val2=terrain.get(j,i+1);
           // val=Math.floor(val/100);
           // val1=Math.floor(val1/100);
           // val2=Math.floor(val2/100);
           // document.write(val+'b');
           vertexArray.push(x);
           vertexArray.push(y);
           vertexArray.push(-val);
           
           var a=vec3.create();
           vec3.set(a,deltaX,0,val1-val);
        
           var b=vec3.create();
           vec3.set(b,0,deltaY, val2-val);
           vec3.cross(a,a,b);
           vec3.normalize(a,a);

           normalArray.push(a[0]);
           normalArray.push(a[1]);
           normalArray.push(a[2]);

        }

        

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}



